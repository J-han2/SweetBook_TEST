from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

settings = get_settings()


def ensure_storage_dirs() -> None:
    Path(settings.storage_root).mkdir(parents=True, exist_ok=True)
    Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.placeholders_dir).mkdir(parents=True, exist_ok=True)


async def save_upload(upload: UploadFile) -> str:
    if not upload.content_type or not upload.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미지 파일만 업로드할 수 있습니다.")

    suffix = os.path.splitext(upload.filename or "")[1] or ".bin"
    filename = f"{uuid4().hex}{suffix.lower()}"
    destination = Path(settings.uploads_dir) / filename

    content = await upload.read()
    destination.write_bytes(content)
    return f"/media/uploads/runtime/{filename}"


def delete_runtime_upload(file_url: str | None) -> None:
    if not file_url or not file_url.startswith("/media/uploads/runtime/"):
        return

    filename = file_url.rsplit("/", 1)[-1]
    path = Path(settings.uploads_dir) / filename
    if path.exists():
        path.unlink()
