from __future__ import annotations

import re
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import TagCategory
from app.models.tag import Tag

MAX_USER_TAGS = 12
MAX_TAG_NAME_LENGTH = 50


def normalize_tag_name(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value.replace("#", " ").strip())
    if not normalized:
        raise ValueError("Tag names cannot be empty.")
    if len(normalized) > MAX_TAG_NAME_LENGTH:
        raise ValueError(f"Tag names must be {MAX_TAG_NAME_LENGTH} characters or fewer.")
    return normalized


def normalize_tag_names(values: Iterable[str] | None) -> list[str]:
    normalized: list[str] = []
    if values is None:
        return normalized

    for value in values:
        if not isinstance(value, str):
            continue
        name = normalize_tag_name(value)
        if name not in normalized:
            normalized.append(name)
        if len(normalized) > MAX_USER_TAGS:
            raise ValueError(f"You can select up to {MAX_USER_TAGS} tags.")

    return normalized


def ensure_tag_records(session: Session, tag_names: Iterable[str], default_category: TagCategory = TagCategory.CUSTOM) -> list[Tag]:
    ordered_names = list(tag_names)
    if not ordered_names:
        return []

    existing_tags = session.scalars(select(Tag).where(Tag.name.in_(ordered_names))).all()
    tag_map = {tag.name: tag for tag in existing_tags}

    for name in ordered_names:
        if name not in tag_map:
            tag = Tag(name=name, category=default_category)
            session.add(tag)
            session.flush()
            tag_map[name] = tag

    return [tag_map[name] for name in ordered_names if name in tag_map]


def list_tag_names(session: Session) -> list[str]:
    return list(session.scalars(select(Tag.name).order_by(Tag.name)).all())
