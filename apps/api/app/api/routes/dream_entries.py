from __future__ import annotations

from datetime import date
import json
import math
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_session
from app.models.book_draft import BookDraftItem
from app.models.dream_entry import DreamEntry
from app.models.tag import Tag
from app.schemas.dream_entry import DreamEntryDeleteResponse, DreamEntryDetailRead, DreamEntryListResponse
from app.services.content_enrichment import pick_representative_image
from app.services.llm_tagger import TaggerUnavailableError, get_tagger
from app.services.media import delete_runtime_upload, save_upload
from app.services.presenters import serialize_entry_detail, serialize_entry_summary
from app.services.tag_registry import ensure_tag_records, normalize_tag_names

router = APIRouter(prefix="/dream-entries", tags=["Dream Entries"])


@router.get("", response_model=DreamEntryListResponse)
def list_dream_entries(
    session: Annotated[Session, Depends(get_session)],
    q: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    tags: list[str] | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    sort: str = Query(default="dream_date_desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=9, ge=1, le=30),
) -> DreamEntryListResponse:
    stmt = select(DreamEntry.id, DreamEntry.dream_date, DreamEntry.created_at)
    try:
        selected_tags = normalize_tag_names([*([tag] if tag else []), *(tags or [])])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                DreamEntry.title.ilike(term),
                DreamEntry.content.ilike(term),
            )
        )

    if selected_tags:
        stmt = (
            stmt.join(DreamEntry.tags)
            .where(Tag.name.in_(selected_tags))
            .group_by(DreamEntry.id, DreamEntry.dream_date, DreamEntry.created_at)
            .having(func.count(func.distinct(Tag.id)) == len(selected_tags))
        )

    if date_from:
        stmt = stmt.where(DreamEntry.dream_date >= date_from)
    if date_to:
        stmt = stmt.where(DreamEntry.dream_date <= date_to)

    if not selected_tags:
        stmt = stmt.distinct()

    if sort == "dream_date_asc":
        stmt = stmt.order_by(DreamEntry.dream_date.asc(), DreamEntry.created_at.desc())
    else:
        stmt = stmt.order_by(DreamEntry.dream_date.desc(), DreamEntry.created_at.desc())

    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    total_pages = max(1, math.ceil(total / page_size)) if total else 1
    page = min(page, total_pages)
    offset = (page - 1) * page_size

    page_rows = session.execute(stmt.offset(offset).limit(page_size)).all()
    page_ids = [row[0] for row in page_rows]
    entries: list[DreamEntry] = []

    if page_ids:
        entry_stmt = (
            select(DreamEntry)
            .where(DreamEntry.id.in_(page_ids))
            .options(selectinload(DreamEntry.tags))
        )
        loaded_entries = session.scalars(entry_stmt).unique().all()
        entries_by_id = {entry.id: entry for entry in loaded_entries}
        entries = [entries_by_id[entry_id] for entry_id in page_ids if entry_id in entries_by_id]

    return DreamEntryListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1,
        items=[serialize_entry_summary(entry) for entry in entries],
    )


@router.get("/{dream_entry_id}", response_model=DreamEntryDetailRead)
def get_dream_entry(
    dream_entry_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> DreamEntryDetailRead:
    entry = _get_entry_or_404(session, dream_entry_id)
    return serialize_entry_detail(entry)


@router.post("", response_model=DreamEntryDetailRead, status_code=status.HTTP_201_CREATED)
async def create_dream_entry(
    session: Annotated[Session, Depends(get_session)],
    title: str = Form(...),
    dream_date: date = Form(...),
    content: str = Form(...),
    manual_tags: str | None = Form(default=None),
    uploaded_image: UploadFile | None = File(default=None),
) -> DreamEntryDetailRead:
    title = title.strip()
    content = content.strip()
    if not title or not content:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="제목과 본문은 비워 둘 수 없습니다.")

    uploaded_image_url = await save_upload(uploaded_image) if uploaded_image else None
    try:
        manual_tag_names = _parse_manual_tags(manual_tags)
        ensure_tag_records(session, manual_tag_names)
        generated_tag_names = _generate_tags(content, additional_allowed_tags=manual_tag_names)
        tag_names = _merge_tag_names(generated_tag_names, manual_tag_names)
    except HTTPException:
        delete_runtime_upload(uploaded_image_url)
        raise

    entry = DreamEntry(
        title=title,
        dream_date=dream_date,
        content=content,
        uploaded_image_url=uploaded_image_url,
        representative_image_url=pick_representative_image(tag_names, uploaded_image_url),
        is_seed=False,
    )
    entry.tags = _resolve_tags(session, tag_names)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return serialize_entry_detail(_get_entry_or_404(session, entry.id))


@router.patch("/{dream_entry_id}", response_model=DreamEntryDetailRead)
async def update_dream_entry(
    dream_entry_id: int,
    session: Annotated[Session, Depends(get_session)],
    title: str | None = Form(default=None),
    dream_date: date | None = Form(default=None),
    content: str | None = Form(default=None),
    manual_tags: str | None = Form(default=None),
    remove_uploaded_image: bool = Form(default=False),
    uploaded_image: UploadFile | None = File(default=None),
) -> DreamEntryDetailRead:
    entry = _get_entry_or_404(session, dream_entry_id)
    current_content = entry.content
    content_changed = content is not None and content.strip() != current_content
    manual_tags_provided = manual_tags is not None
    manual_tag_names = _parse_manual_tags(manual_tags) if manual_tags_provided else []
    manual_tags_changed = manual_tags_provided and set(manual_tag_names) != {tag.name for tag in entry.tags}
    previous_uploaded_image_url = entry.uploaded_image_url
    new_uploaded_image_url: str | None = None
    delete_previous_after_commit = False

    if title is not None:
        title = title.strip()
        if not title:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="제목은 비워 둘 수 없습니다.")
        entry.title = title

    if dream_date is not None:
        entry.dream_date = dream_date

    if content is not None:
        content = content.strip()
        if not content:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="본문은 비워 둘 수 없습니다.")
        entry.content = content

    if remove_uploaded_image and not uploaded_image:
        entry.uploaded_image_url = None
        delete_previous_after_commit = True

    if uploaded_image:
        new_uploaded_image_url = await save_upload(uploaded_image)
        entry.uploaded_image_url = new_uploaded_image_url
        delete_previous_after_commit = True

    if manual_tags_provided:
        ensure_tag_records(session, manual_tag_names)

    if content_changed or manual_tags_changed:
        try:
            if content_changed:
                generated_tag_names = _generate_tags(
                    entry.content,
                    additional_allowed_tags=manual_tag_names if manual_tags_provided else None,
                )
                tag_names = _merge_tag_names(
                    generated_tag_names,
                    manual_tag_names if manual_tags_provided else [],
                )
            else:
                tag_names = manual_tag_names
        except HTTPException:
            if new_uploaded_image_url:
                delete_runtime_upload(new_uploaded_image_url)
            entry.uploaded_image_url = previous_uploaded_image_url
            raise
        entry.tags = _resolve_tags(session, tag_names)
        entry.representative_image_url = pick_representative_image(tag_names, entry.uploaded_image_url)
    elif remove_uploaded_image or uploaded_image:
        current_tags = [tag.name for tag in entry.tags]
        entry.representative_image_url = pick_representative_image(current_tags, entry.uploaded_image_url)

    session.add(entry)
    session.commit()
    if delete_previous_after_commit and previous_uploaded_image_url and previous_uploaded_image_url != entry.uploaded_image_url:
        delete_runtime_upload(previous_uploaded_image_url)
    session.refresh(entry)
    return serialize_entry_detail(_get_entry_or_404(session, entry.id))


@router.delete("/{dream_entry_id}", response_model=DreamEntryDeleteResponse)
def delete_dream_entry(
    dream_entry_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> DreamEntryDeleteResponse:
    entry = _get_entry_or_404(session, dream_entry_id)
    draft_item = session.scalar(select(BookDraftItem).where(BookDraftItem.dream_entry_id == dream_entry_id).limit(1))
    if draft_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="책 초안에 포함된 꿈일기는 삭제할 수 없습니다. 초안에서 먼저 제거해 주세요.",
        )

    delete_runtime_upload(entry.uploaded_image_url)
    session.delete(entry)
    session.commit()
    return DreamEntryDeleteResponse(ok=True)


def _get_entry_or_404(session: Session, dream_entry_id: int) -> DreamEntry:
    stmt = (
        select(DreamEntry)
        .where(DreamEntry.id == dream_entry_id)
        .options(selectinload(DreamEntry.tags))
    )
    entry = session.scalar(stmt)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="꿈일기를 찾을 수 없습니다.")
    return entry


def _resolve_tags(session: Session, tag_names: list[str]) -> list[Tag]:
    if not tag_names:
        return []
    return ensure_tag_records(session, tag_names)


def _generate_tags(content: str, additional_allowed_tags: list[str] | None = None) -> list[str]:
    try:
        return get_tagger().generate_tags(content, additional_allowed_tags=additional_allowed_tags)
    except TaggerUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


def _parse_manual_tags(raw: str | None) -> list[str]:
    if raw is None or not raw.strip():
        return []

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="manual_tags must be a JSON string array.",
        ) from exc

    if not isinstance(payload, list):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="manual_tags must be a JSON string array.",
        )

    try:
        return normalize_tag_names(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


def _merge_tag_names(generated_tag_names: list[str], manual_tag_names: list[str]) -> list[str]:
    merged: list[str] = []
    for tag_name in [*generated_tag_names, *manual_tag_names]:
        if tag_name not in merged:
            merged.append(tag_name)
    return merged
