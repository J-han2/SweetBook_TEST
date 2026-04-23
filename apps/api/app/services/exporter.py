from __future__ import annotations

from app.models.order import Order


def build_order_export(order: Order) -> dict:
    items = sorted(order.book_draft.items, key=lambda item: item.sort_order)
    return {
        "exportVersion": order.export_version,
        "order": {
            "id": order.id,
            "status": order.status.value,
            "quantity": order.quantity,
            "createdAt": order.created_at.isoformat(),
            "updatedAt": order.updated_at.isoformat(),
        },
        "book": {
            "id": order.book_draft.id,
            "title": order.book_draft.title,
            "subtitle": order.book_draft.subtitle,
            "coverPhrase": order.book_draft.cover_phrase,
            "coverTheme": order.book_draft.cover_theme,
            "status": order.book_draft.status.value,
        },
        "entries": [
            {
                "order": item.sort_order,
                "id": item.dream_entry.id,
                "title": item.dream_entry.title,
                "dreamDate": item.dream_entry.dream_date.isoformat(),
                "content": item.dream_entry.content,
                "memo": item.dream_entry.memo,
                "representativeImageUrl": item.dream_entry.representative_image_url,
                "uploadedImageUrl": item.dream_entry.uploaded_image_url,
                "moodSummary": item.dream_entry.mood_summary,
                "tags": [tag.name for tag in sorted(item.dream_entry.tags, key=lambda tag: (tag.category.value, tag.name))],
            }
            for item in items
        ],
    }
