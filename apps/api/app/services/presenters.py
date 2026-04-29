from __future__ import annotations

from app.models.book_draft import BookDraft, BookDraftItem
from app.models.dream_entry import DreamEntry
from app.models.order import Order
from app.models.tag import Tag
from app.schemas.book_draft import BookDraftItemRead, BookDraftRead
from app.schemas.dream_entry import DreamEntryDetailRead, DreamEntrySummaryRead
from app.schemas.order import OrderRead
from app.schemas.tag import TagRead


def serialize_tag(tag: Tag) -> TagRead:
    return TagRead.model_validate(tag)


def serialize_entry_summary(entry: DreamEntry) -> DreamEntrySummaryRead:
    return DreamEntrySummaryRead(
        id=entry.id,
        title=entry.title,
        dream_date=entry.dream_date,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        image_url=entry.image_url,
        is_seed=entry.is_seed,
        content_preview=entry.content_preview,
        tags=[serialize_tag(tag) for tag in sorted(entry.tags, key=lambda item: (item.category.value, item.name))],
    )


def serialize_entry_detail(entry: DreamEntry) -> DreamEntryDetailRead:
    return DreamEntryDetailRead(
        id=entry.id,
        title=entry.title,
        dream_date=entry.dream_date,
        content=entry.content,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        image_url=entry.image_url,
        is_seed=entry.is_seed,
        tags=[serialize_tag(tag) for tag in sorted(entry.tags, key=lambda item: (item.category.value, item.name))],
    )


def serialize_book_draft_item(item: BookDraftItem) -> BookDraftItemRead:
    return BookDraftItemRead(
        id=item.id,
        sort_order=item.sort_order,
        dream_entry=serialize_entry_summary(item.dream_entry),
    )


def serialize_book_draft(draft: BookDraft) -> BookDraftRead:
    ordered_items = sorted(draft.items, key=lambda item: item.sort_order)
    return BookDraftRead(
        id=draft.id,
        title=draft.title,
        subtitle=draft.subtitle,
        cover_phrase=draft.cover_phrase,
        cover_theme=draft.cover_theme,
        status=draft.status,
        created_at=draft.created_at,
        updated_at=draft.updated_at,
        items=[serialize_book_draft_item(item) for item in ordered_items],
    )


def serialize_order(order: Order) -> OrderRead:
    return OrderRead(
        id=order.id,
        status=order.status,
        quantity=order.quantity,
        recipient_name=order.recipient_name,
        recipient_phone=order.recipient_phone,
        shipping_address=order.shipping_address,
        shipping_address_detail=order.shipping_address_detail,
        export_version=order.export_version,
        created_at=order.created_at,
        updated_at=order.updated_at,
        book_draft=serialize_book_draft(order.book_draft),
    )
