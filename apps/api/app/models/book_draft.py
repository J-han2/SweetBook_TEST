from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import BookDraftStatus

if TYPE_CHECKING:
    from app.models.dream_entry import DreamEntry
    from app.models.order import Order


class BookDraft(Base):
    __tablename__ = "book_drafts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    subtitle: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cover_phrase: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_theme: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[BookDraftStatus] = mapped_column(SqlEnum(BookDraftStatus, native_enum=False), default=BookDraftStatus.DRAFT)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
    )

    items: Mapped[list["BookDraftItem"]] = relationship(
        back_populates="book_draft",
        cascade="all, delete-orphan",
        order_by="BookDraftItem.sort_order",
        lazy="selectin",
    )
    orders: Mapped[list[Order]] = relationship(back_populates="book_draft")


class BookDraftItem(Base):
    __tablename__ = "book_draft_items"
    __table_args__ = (UniqueConstraint("book_draft_id", "dream_entry_id", name="uq_book_draft_entry"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    book_draft_id: Mapped[int] = mapped_column(ForeignKey("book_drafts.id", ondelete="CASCADE"), index=True)
    dream_entry_id: Mapped[int] = mapped_column(ForeignKey("dream_entries.id", ondelete="RESTRICT"), index=True)
    sort_order: Mapped[int] = mapped_column(Integer)

    book_draft: Mapped[BookDraft] = relationship(back_populates="items")
    dream_entry: Mapped["DreamEntry"] = relationship(back_populates="book_draft_items", lazy="selectin")
