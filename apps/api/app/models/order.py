from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import ExportStatus, OrderStatus

if TYPE_CHECKING:
    from app.models.book_draft import BookDraft
    from app.models.order_history import OrderStatusHistory


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    book_draft_id: Mapped[int] = mapped_column(ForeignKey("book_drafts.id", ondelete="RESTRICT"), index=True)
    status: Mapped[OrderStatus] = mapped_column(SqlEnum(OrderStatus, native_enum=False), default=OrderStatus.PENDING)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    recipient_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recipient_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    shipping_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shipping_address_detail: Mapped[str | None] = mapped_column(String(255), nullable=True)
    export_version: Mapped[str] = mapped_column(String(20), default="1.0")
    export_status: Mapped[ExportStatus] = mapped_column(
        SqlEnum(ExportStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=ExportStatus.PENDING,
        server_default="pending",
    )
    export_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
    )

    book_draft: Mapped["BookDraft"] = relationship(back_populates="orders", lazy="selectin")
    status_history: Mapped[list["OrderStatusHistory"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.changed_at"
    )
