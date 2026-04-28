from datetime import datetime

from pydantic import BaseModel, Field

from app.core.enums import OrderStatus
from app.schemas.book_draft import BookDraftRead
from app.schemas.common import ORMModel, PaginatedResponse


class OrderCreateRequest(BaseModel):
    book_draft_id: int


class OrderUpdateRequest(BaseModel):
    quantity: int | None = Field(default=None, ge=1, le=99)
    recipient_name: str | None = Field(default=None, max_length=100)
    recipient_phone: str | None = Field(default=None, max_length=30)
    shipping_address: str | None = Field(default=None, max_length=255)
    shipping_address_detail: str | None = Field(default=None, max_length=255)


class OrderConfirmRequest(BaseModel):
    quantity: int = Field(ge=1, le=99)
    recipient_name: str = Field(min_length=1, max_length=100)
    recipient_phone: str = Field(min_length=1, max_length=30)
    shipping_address: str = Field(min_length=1, max_length=255)
    shipping_address_detail: str | None = Field(default=None, max_length=255)


class OrderRead(ORMModel):
    id: int
    status: OrderStatus
    quantity: int
    recipient_name: str | None
    recipient_phone: str | None
    shipping_address: str | None
    shipping_address_detail: str | None
    export_version: str
    created_at: datetime
    updated_at: datetime
    book_draft: BookDraftRead


class OrderListResponse(PaginatedResponse):
    items: list[OrderRead]
