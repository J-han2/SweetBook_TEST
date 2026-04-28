from datetime import datetime

from pydantic import BaseModel

from app.core.enums import ExportStatus, OrderStatus
from app.schemas.book_draft import BookDraftRead
from app.schemas.common import ORMModel, PaginatedResponse


class OrderStatusHistoryRead(ORMModel):
    id: int
    order_id: int
    from_status: str | None
    to_status: str
    note: str | None
    changed_at: datetime


class AdminOrderRead(ORMModel):
    id: int
    status: OrderStatus
    quantity: int
    recipient_name: str | None
    recipient_phone: str | None
    shipping_address: str | None
    shipping_address_detail: str | None
    export_status: ExportStatus
    export_error: str | None
    admin_memo: str | None
    export_version: str
    created_at: datetime
    updated_at: datetime
    book_draft: BookDraftRead
    status_history: list[OrderStatusHistoryRead] = []


class AdminOrderListResponse(PaginatedResponse):
    items: list[AdminOrderRead]


class BulkStatusChangeRequest(BaseModel):
    order_ids: list[int]
    to_status: OrderStatus
    note: str | None = None


class BulkStatusChangeResult(BaseModel):
    success_count: int
    failure_count: int
    failures: list[dict]


class BulkExportRequest(BaseModel):
    order_ids: list[int]


class BulkExportResult(BaseModel):
    success_count: int
    failure_count: int
    failures: list[dict]
    download_urls: list[dict]


class AdminMemoRequest(BaseModel):
    memo: str | None = None


class AdminStats(BaseModel):
    total_orders: int
    pending_orders: int
    confirmed_orders: int
    processing_orders: int
    shipped_orders: int
    received_orders: int
    cancelled_orders: int
    export_pending: int
    export_processing: int
    export_completed: int
    export_failed: int
    popular_tags: list[dict]
    total_dreams: int
