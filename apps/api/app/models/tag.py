from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum as SqlEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import TagCategory

if TYPE_CHECKING:
    from app.models.dream_entry import DreamEntry


class DreamEntryTag(Base):
    __tablename__ = "dream_entry_tags"
    __table_args__ = (UniqueConstraint("dream_entry_id", "tag_id", name="uq_dream_entry_tag"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    dream_entry_id: Mapped[int] = mapped_column(ForeignKey("dream_entries.id", ondelete="CASCADE"), index=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), index=True)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    category: Mapped[TagCategory] = mapped_column(SqlEnum(TagCategory, native_enum=False))

    dream_entries: Mapped[list[DreamEntry]] = relationship(
        "DreamEntry",
        secondary="dream_entry_tags",
        back_populates="tags",
    )
