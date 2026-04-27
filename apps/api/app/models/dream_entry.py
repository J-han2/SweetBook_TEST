from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.book_draft import BookDraftItem
    from app.models.tag import Tag


class DreamEntry(Base):
    __tablename__ = "dream_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    dream_date: Mapped[date] = mapped_column(Date, index=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
    )
    representative_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    uploaded_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mood_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_seed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")

    tags: Mapped[list[Tag]] = relationship(
        "Tag",
        secondary="dream_entry_tags",
        back_populates="dream_entries",
        lazy="selectin",
    )
    book_draft_items: Mapped[list[BookDraftItem]] = relationship(back_populates="dream_entry")

    @property
    def content_preview(self) -> str:
        snippet = " ".join(self.content.strip().split())
        return f"{snippet[:137]}..." if len(snippet) > 140 else snippet
