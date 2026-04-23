from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_session
from app.core.enums import BookDraftStatus
from app.models.book_draft import BookDraft, BookDraftItem
from app.models.dream_entry import DreamEntry
from app.schemas.book_draft import (
    BookDraftCreateRequest,
    BookDraftListResponse,
    BookDraftRead,
    BookDraftReorderRequest,
    BookDraftUpdateRequest,
)
from app.services.presenters import serialize_book_draft

router = APIRouter(prefix="/book-drafts", tags=["Book Drafts"])


@router.post("", response_model=BookDraftRead, status_code=status.HTTP_201_CREATED)
def create_book_draft(
    payload: BookDraftCreateRequest,
    session: Annotated[Session, Depends(get_session)],
) -> BookDraftRead:
    clean_title = payload.title.strip()
    if not clean_title:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="책 제목은 비워 둘 수 없습니다.")

    unique_ids = list(dict.fromkeys(payload.dream_entry_ids))
    entries = session.scalars(
        select(DreamEntry).where(DreamEntry.id.in_(unique_ids)).options(selectinload(DreamEntry.tags))
    ).all()
    entry_map = {entry.id: entry for entry in entries}
    missing_ids = [entry_id for entry_id in unique_ids if entry_id not in entry_map]
    if missing_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"꿈일기를 찾을 수 없습니다: {missing_ids}")

    draft = BookDraft(
        title=clean_title,
        subtitle=payload.subtitle.strip() if payload.subtitle else None,
        cover_phrase=payload.cover_phrase.strip() if payload.cover_phrase else None,
        cover_theme=payload.cover_theme,
        status=BookDraftStatus.DRAFT,
    )
    session.add(draft)
    session.flush()

    for index, dream_entry_id in enumerate(unique_ids, start=1):
        session.add(BookDraftItem(book_draft_id=draft.id, dream_entry_id=dream_entry_id, sort_order=index))

    session.commit()
    return serialize_book_draft(_get_draft_or_404(session, draft.id))


@router.get("", response_model=BookDraftListResponse)
def list_book_drafts(session: Annotated[Session, Depends(get_session)]) -> BookDraftListResponse:
    drafts = session.scalars(
        select(BookDraft)
        .options(
            selectinload(BookDraft.items)
            .selectinload(BookDraftItem.dream_entry)
            .selectinload(DreamEntry.tags)
        )
        .order_by(BookDraft.updated_at.desc())
    ).all()
    return BookDraftListResponse(total=len(drafts), items=[serialize_book_draft(draft) for draft in drafts])


@router.get("/{book_draft_id}", response_model=BookDraftRead)
def get_book_draft(
    book_draft_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> BookDraftRead:
    return serialize_book_draft(_get_draft_or_404(session, book_draft_id))


@router.patch("/{book_draft_id}", response_model=BookDraftRead)
def update_book_draft(
    book_draft_id: int,
    payload: BookDraftUpdateRequest,
    session: Annotated[Session, Depends(get_session)],
) -> BookDraftRead:
    draft = _get_draft_or_404(session, book_draft_id)
    _ensure_draft_editable(draft)

    if payload.title is not None:
        clean_title = payload.title.strip()
        if not clean_title:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="책 제목은 비워 둘 수 없습니다.")
        draft.title = clean_title
    if payload.subtitle is not None:
        draft.subtitle = payload.subtitle.strip() or None
    if payload.cover_phrase is not None:
        draft.cover_phrase = payload.cover_phrase.strip() or None
    if payload.cover_theme is not None:
        draft.cover_theme = payload.cover_theme

    session.add(draft)
    session.commit()
    return serialize_book_draft(_get_draft_or_404(session, draft.id))


@router.patch("/{book_draft_id}/items/reorder", response_model=BookDraftRead)
def reorder_book_draft_items(
    book_draft_id: int,
    payload: BookDraftReorderRequest,
    session: Annotated[Session, Depends(get_session)],
) -> BookDraftRead:
    draft = _get_draft_or_404(session, book_draft_id)
    _ensure_draft_editable(draft)

    existing_ids = [item.id for item in draft.items]
    if sorted(existing_ids) != sorted(payload.ordered_item_ids):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="순서 변경 대상이 현재 아이템과 일치하지 않습니다.")

    item_map = {item.id: item for item in draft.items}
    for index, item_id in enumerate(payload.ordered_item_ids, start=1):
        item_map[item_id].sort_order = index

    session.commit()
    return serialize_book_draft(_get_draft_or_404(session, draft.id))


@router.post("/{book_draft_id}/finalize", response_model=BookDraftRead)
def finalize_book_draft(
    book_draft_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> BookDraftRead:
    draft = _get_draft_or_404(session, book_draft_id)
    if not draft.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="최소 1개의 꿈일기가 있어야 책 초안을 확정할 수 있습니다.")

    draft.status = BookDraftStatus.FINALIZED
    session.add(draft)
    session.commit()
    return serialize_book_draft(_get_draft_or_404(session, draft.id))


def _get_draft_or_404(session: Session, book_draft_id: int) -> BookDraft:
    stmt = (
        select(BookDraft)
        .where(BookDraft.id == book_draft_id)
        .options(
            selectinload(BookDraft.items)
            .selectinload(BookDraftItem.dream_entry)
            .selectinload(DreamEntry.tags)
        )
    )
    draft = session.scalar(stmt)
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="책 초안을 찾을 수 없습니다.")
    return draft


def _ensure_draft_editable(draft: BookDraft) -> None:
    if draft.status == BookDraftStatus.FINALIZED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Finalized 상태의 책 초안은 수정할 수 없습니다.")
