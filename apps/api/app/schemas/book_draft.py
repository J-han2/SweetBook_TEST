from datetime import datetime

from pydantic import BaseModel, Field

from app.core.enums import BookDraftStatus
from app.schemas.common import ORMModel, PaginatedResponse
from app.schemas.dream_entry import DreamEntrySummaryRead


class BookDraftCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    subtitle: str | None = Field(default=None, max_length=200)
    cover_phrase: str | None = Field(default=None, max_length=255)
    cover_theme: str | None = Field(default=None, max_length=100)
    dream_entry_ids: list[int] = Field(min_length=1)


class BookDraftUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    subtitle: str | None = Field(default=None, max_length=200)
    cover_phrase: str | None = Field(default=None, max_length=255)
    cover_theme: str | None = Field(default=None, max_length=100)


class BookDraftReorderRequest(BaseModel):
    ordered_item_ids: list[int] = Field(min_length=1)


class BookDraftItemAddRequest(BaseModel):
    dream_entry_id: int


class BookDraftItemRead(ORMModel):
    id: int
    sort_order: int
    dream_entry: DreamEntrySummaryRead


class BookDraftRead(ORMModel):
    id: int
    title: str
    subtitle: str | None
    cover_phrase: str | None
    cover_theme: str | None
    status: BookDraftStatus
    created_at: datetime
    updated_at: datetime
    items: list[BookDraftItemRead]


class BookDraftListResponse(PaginatedResponse):
    items: list[BookDraftRead]
