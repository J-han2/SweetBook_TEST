from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from app.core.config import get_settings
from app.models.order import Order

settings = get_settings()


def build_order_export(order: Order, folder_prefix: str = "") -> dict:
    items = sorted(order.book_draft.items, key=lambda item: item.sort_order)
    entries = []

    for item in items:
        image_file, missing_image = _resolve_export_image(
            item.dream_entry.image_url,
            order_id=order.id,
            item_sort_order=item.sort_order,
            folder_prefix=folder_prefix,
        )

        entries.append(
            {
                "order": item.sort_order,
                "id": item.dream_entry.id,
                "title": item.dream_entry.title,
                "dreamDate": item.dream_entry.dream_date.isoformat(),
                "content": item.dream_entry.content,
                "imageUrl": item.dream_entry.image_url,
                "imageFile": image_file,
                "missingImage": missing_image,
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
    archive = BytesIO()

    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as zip_file:
        payload = build_order_export(order)
        zip_file.writestr("metadata.json", json.dumps(payload, ensure_ascii=False, indent=2))
        _write_order_images(zip_file, order)

    archive.seek(0)
    return archive.getvalue()


def build_multi_order_export_archive(orders: list[Order]) -> bytes:
    archive = BytesIO()

    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as zip_file:
        written_paths: set[str] = set()

        for order in sorted(orders, key=lambda item: item.id):
            folder = f"orders/order-{order.id}"
            payload = build_order_export(order, folder_prefix=folder)
            zip_file.writestr(f"{folder}/metadata.json", json.dumps(payload, ensure_ascii=False, indent=2))
            _write_order_images(zip_file, order, folder_prefix=folder, written_paths=written_paths)

    archive.seek(0)
    return archive.getvalue()


def _write_order_images(
    zip_file: ZipFile,
    order: Order,
    folder_prefix: str = "",
    written_paths: set[str] | None = None,
) -> None:
    written = written_paths if written_paths is not None else set()
    items = sorted(order.book_draft.items, key=lambda item: item.sort_order)

    for item in items:
        relative_path, _missing = _resolve_export_image(
            item.dream_entry.image_url,
            order_id=order.id,
            item_sort_order=item.sort_order,
            folder_prefix=folder_prefix,
        )
        if not relative_path or relative_path in written:
            continue

        source = _media_url_to_file_path(item.dream_entry.image_url)
        if source is None or not source.exists():
            continue

        zip_file.write(source, relative_path)
        written.add(relative_path)


def _resolve_export_image(
    media_url: str | None,
    order_id: int,
    item_sort_order: int,
    folder_prefix: str = "",
) -> tuple[str | None, dict | None]:
    source = _media_url_to_file_path(media_url)
    if source is None:
        return None, None

    if not source.exists():
        return None, {"sourceUrl": media_url, "reason": "file_not_found"}

    suffix = source.suffix or ".bin"
    base_path = f"images/order-{order_id}-{item_sort_order}{suffix.lower()}"
    relative_path = f"{folder_prefix}/{base_path}" if folder_prefix else base_path
    return relative_path, None


def _media_url_to_file_path(media_url: str | None) -> Path | None:
    if not media_url or not media_url.startswith("/media/"):
        return None

    relative = media_url.removeprefix("/media/").lstrip("/")
    if not relative:
        return None

    return Path(settings.storage_root) / relative
