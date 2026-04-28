from __future__ import annotations

from app.core.constants import DEFAULT_PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE_MAP


def pick_representative_image(tag_names: list[str], uploaded_image_url: str | None) -> str:
    if uploaded_image_url:
        return uploaded_image_url

    for tag in tag_names:
        filename = PLACEHOLDER_IMAGE_MAP.get(tag)
        if filename:
            return f"/media/placeholders/{filename}"

    return f"/media/placeholders/{DEFAULT_PLACEHOLDER_IMAGE}"
