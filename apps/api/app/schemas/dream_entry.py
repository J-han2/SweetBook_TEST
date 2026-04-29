from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.common import ORMModel, PaginatedResponse
from app.schemas.tag import TagRead


class DreamEntrySummaryRead(ORMModel):
    id: int
    title: str
    dream_date: date
    created_at: datetime
    updated_at: datetime
    image_url: str | None
    is_seed: bool
    content_preview: str
    tags: list[TagRead]


class DreamEntryDetailRead(ORMModel):
    id: int
    title: str
    dream_date: date
    content: str
    created_at: datetime
    updated_at: datetime
    image_url: str | None
    is_seed: bool
    tags: list[TagRead]


class DreamEntryListResponse(PaginatedResponse):
    items: list[DreamEntrySummaryRead]


class DreamEntryDeleteResponse(BaseModel):
    ok: bool
