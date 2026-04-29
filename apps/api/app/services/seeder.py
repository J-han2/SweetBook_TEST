from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import TAG_CATALOG
from app.core.enums import BookDraftStatus, OrderStatus
from app.models.book_draft import BookDraft, BookDraftItem
from app.models.dream_entry import DreamEntry
from app.models.order import Order
from app.models.order_history import OrderStatusHistory
from app.models.tag import Tag
from app.services.content_enrichment import pick_representative_image
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
        image_url = dream.get("image_url")
        entry = DreamEntry(
            title=dream["title"],
            dream_date=date.fromisoformat(dream["dream_date"]),
            content=dream["content"],
            image_url=pick_representative_image(tag_names, image_url),
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
            recipient_name=order_seed.get("recipient_name"),
            recipient_phone=order_seed.get("recipient_phone"),
            shipping_address=order_seed.get("shipping_address"),
            shipping_address_detail=order_seed.get("shipping_address_detail"),
            export_version="1.0",
            admin_memo=order_seed.get("admin_memo"),
            created_at=datetime.fromisoformat(order_seed["created_at"]) if order_seed.get("created_at") else None,
            updated_at=datetime.fromisoformat(order_seed["updated_at"]) if order_seed.get("updated_at") else None,
        )
        session.add(order)
        session.flush()

        if order_seed.get("history"):
            for history_seed in order_seed["history"]:
                session.add(
                    OrderStatusHistory(
                        order_id=order.id,
                        from_status=history_seed.get("from_status"),
                        to_status=history_seed["to_status"],
                        note=history_seed.get("note"),
                        changed_at=datetime.fromisoformat(history_seed["changed_at"]) if history_seed.get("changed_at") else None,
                    )
                )
        elif order.status != OrderStatus.PENDING:
            session.add(
                OrderStatusHistory(
                    order_id=order.id,
                    from_status=OrderStatus.PENDING.value,
                    to_status=order.status.value,
                    note="seed",
                )
            )

    session.commit()


def _ensure_tags(session: Session) -> None:
    existing = {tag.name for tag in session.scalars(select(Tag)).all()}
    for category, names in TAG_CATALOG.items():
        for name in names:
            if name not in existing:
                session.add(Tag(name=name, category=category))
