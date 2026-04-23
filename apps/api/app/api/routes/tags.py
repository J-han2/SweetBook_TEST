from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.models.tag import DreamEntryTag, Tag
from app.schemas.tag import PopularTagRead, TagCreateRequest, TagRead
from app.services.tag_registry import ensure_tag_records, normalize_tag_name

router = APIRouter(prefix="/tags", tags=["Tags"])


@router.get("", response_model=list[TagRead])
def list_tags(session: Annotated[Session, Depends(get_session)]) -> list[TagRead]:
    tags = session.scalars(select(Tag).order_by(Tag.category, Tag.name)).all()
    return [TagRead.model_validate(tag) for tag in tags]


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
def create_tag(payload: TagCreateRequest, session: Annotated[Session, Depends(get_session)]) -> TagRead:
    try:
        name = normalize_tag_name(payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    existing = session.scalar(select(Tag).where(Tag.name == name))
    if existing:
        return TagRead.model_validate(existing)

    tag = ensure_tag_records(session, [name], default_category=payload.category)[0]
    session.commit()
    session.refresh(tag)
    return TagRead.model_validate(tag)


@router.get("/popular", response_model=list[PopularTagRead])
def popular_tags(session: Annotated[Session, Depends(get_session)]) -> list[PopularTagRead]:
    rows = session.execute(
        select(Tag, func.count(DreamEntryTag.id).label("usage_count"))
        .outerjoin(DreamEntryTag, DreamEntryTag.tag_id == Tag.id)
        .group_by(Tag.id)
        .order_by(desc("usage_count"), Tag.name)
        .limit(10)
    ).all()
    return [
        PopularTagRead(id=tag.id, name=tag.name, category=tag.category, usage_count=usage_count)
        for tag, usage_count in rows
    ]
