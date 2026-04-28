from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from app.core.config import get_settings
from app.models.order import Order

settings = get_settings()


def build_order_export(order: Order) -> dict:
    items = sorted(order.book_draft.items, key=lambda item: item.sort_order)
    entries = []

    for item in items:
        representative_file, representative_missing = _resolve_export_image(
            item.dream_entry.representative_image_url,
            item.dream_entry.id,
            "representative",
        )
        uploaded_file, uploaded_missing = _resolve_export_image(
            item.dream_entry.uploaded_image_url,
            item.dream_entry.id,
            "uploaded",
        )

        missing_images = [entry for entry in [representative_missing, uploaded_missing] if entry]

        entries.append(
            {
                "order": item.sort_order,
                "id": item.dream_entry.id,
                "title": item.dream_entry.title,
                "dreamDate": item.dream_entry.dream_date.isoformat(),
                "content": item.dream_entry.content,
                "representativeImageUrl": item.dream_entry.representative_image_url,
                "uploadedImageUrl": item.dream_entry.uploaded_image_url,
                "representativeImageFile": representative_file,
                "uploadedImageFile": uploaded_file,
                "missingImages": missing_images,
                "tags": [tag.name for tag in sorted(item.dream_entry.tags, key=lambda tag: (tag.category.value, tag.name))],
            }
        )

    return {
        "exportVersion": order.export_version,
        "order": {
            "id": order.id,
            "status": order.status.value,
            "quantity": order.quantity,
            "recipientName": order.recipient_name,
            "recipientPhone": order.recipient_phone,
            "shippingAddress": order.shipping_address,
            "shippingAddressDetail": order.shipping_address_detail,
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
        "entries": entries,
    }


def build_order_export_archive(order: Order) -> bytes:
    payload = build_order_export(order)
    archive = BytesIO()

    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as zip_file:
        zip_file.writestr("metadata.json", json.dumps(payload, ensure_ascii=False, indent=2))

        written_paths: set[str] = set()
        items = sorted(order.book_draft.items, key=lambda item: item.sort_order)
        for item in items:
            export_assets = [
                (
                    item.dream_entry.representative_image_url,
                    *_resolve_export_image(item.dream_entry.representative_image_url, item.dream_entry.id, "representative"),
                ),
                (
                    item.dream_entry.uploaded_image_url,
                    *_resolve_export_image(item.dream_entry.uploaded_image_url, item.dream_entry.id, "uploaded"),
                ),
            ]
            for media_url, relative_path, _missing in export_assets:
                if not relative_path or relative_path in written_paths:
                    continue

                source = _media_url_to_file_path(media_url)
                if source is None or not source.exists():
                    continue

                zip_file.write(source, relative_path)
                written_paths.add(relative_path)

    archive.seek(0)
    return archive.getvalue()


def _resolve_export_image(
    media_url: str | None,
    dream_entry_id: int,
    kind: str,
) -> tuple[str | None, dict | None]:
    source = _media_url_to_file_path(media_url)
    if source is None:
        return None, None

    if not source.exists():
        return None, {"kind": kind, "sourceUrl": media_url, "reason": "file_not_found"}

    suffix = source.suffix or ".bin"
    relative_path = f"images/{dream_entry_id}-{kind}{suffix.lower()}"
    return relative_path, None


def _media_url_to_file_path(media_url: str | None) -> Path | None:
    if not media_url or not media_url.startswith("/media/"):
        return None

    relative = media_url.removeprefix("/media/").lstrip("/")
    if not relative:
        return None

    return Path(settings.storage_root) / relative
