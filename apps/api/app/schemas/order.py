from datetime import datetime

from pydantic import BaseModel, Field

from app.core.enums import OrderStatus
from app.schemas.book_draft import BookDraftRead
from app.schemas.common import ORMModel, PaginatedResponse


class OrderCreateRequest(BaseModel):
    book_draft_id: int
    quantity: int = Field(default=1, ge=1, le=99)


class OrderStatusUpdateRequest(BaseModel):
    status: OrderStatus


class OrderRead(ORMModel):
    id: int
    status: OrderStatus
    quantity: int
    export_version: str
    created_at: datetime
    updated_at: datetime
    book_draft: BookDraftRead


class OrderListResponse(PaginatedResponse):
    items: list[OrderRead]
