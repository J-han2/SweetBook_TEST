from __future__ import annotations

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import TAG_CATALOG
from app.core.enums import BookDraftStatus, OrderStatus
from app.models.book_draft import BookDraft, BookDraftItem
from app.models.dream_entry import DreamEntry
from app.models.order import Order
from app.models.tag import Tag
from app.services.content_enrichment import build_mood_summary, pick_representative_image
from app.services.seed_data import SEED_BOOK_DRAFTS, SEED_DREAMS, SEED_ORDERS


def seed_database(session: Session) -> None:
    existing_count = session.scalar(select(func.count(DreamEntry.id))) or 0
    _ensure_tags(session)
    session.flush()
    if existing_count > 0:
        session.commit()
        return

    tag_map = {tag.name: tag for tag in session.scalars(select(Tag)).all()}
    entry_map: dict[str, DreamEntry] = {}

    for dream in SEED_DREAMS:
        tag_names = dream["tags"]
        uploaded_image_url = dream.get("uploaded_image_url")
        entry = DreamEntry(
            title=dream["title"],
            dream_date=date.fromisoformat(dream["dream_date"]),
            content=dream["content"],
            memo=dream["memo"],
            uploaded_image_url=uploaded_image_url,
            representative_image_url=pick_representative_image(tag_names, uploaded_image_url),
            mood_summary=build_mood_summary(tag_names),
            is_seed=True,
        )
        entry.tags = [tag_map[name] for name in tag_names]
        session.add(entry)
        session.flush()
        entry_map[entry.title] = entry

    draft_map: dict[str, BookDraft] = {}
    for draft_seed in SEED_BOOK_DRAFTS:
        draft = BookDraft(
            title=draft_seed["title"],
            subtitle=draft_seed["subtitle"],
            cover_phrase=draft_seed["cover_phrase"],
            cover_theme=draft_seed["cover_theme"],
            status=BookDraftStatus(draft_seed["status"]),
        )
        session.add(draft)
        session.flush()

        for index, entry_title in enumerate(draft_seed["entry_titles"], start=1):
            session.add(
                BookDraftItem(
                    book_draft_id=draft.id,
                    dream_entry_id=entry_map[entry_title].id,
                    sort_order=index,
                )
            )

        draft_map[draft.title] = draft

    for order_seed in SEED_ORDERS:
        order = Order(
            book_draft_id=draft_map[order_seed["book_title"]].id,
            quantity=order_seed["quantity"],
            status=OrderStatus(order_seed["status"]),
            export_version="1.0",
        )
        session.add(order)

    session.commit()


def _ensure_tags(session: Session) -> None:
    existing = {tag.name for tag in session.scalars(select(Tag)).all()}
    for category, names in TAG_CATALOG.items():
        for name in names:
            if name not in existing:
                session.add(Tag(name=name, category=category))
