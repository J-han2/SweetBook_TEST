from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas.ai import TagPreviewRead, TagPreviewRequest, TaggerStatusRead
from app.services.llm_tagger import TaggerUnavailableError, get_tagger
from app.services.tag_registry import normalize_tag_names

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/tagger-status", response_model=TaggerStatusRead)
def tagger_status() -> TaggerStatusRead:
    tagger = get_tagger()
    status_payload = tagger.model_status()
    return TaggerStatusRead(
        available=bool(status_payload["available"]),
        modelPath=str(status_payload["modelPath"]),
        chatFormat=tagger.settings.llm_chat_format,
        nCtx=tagger.settings.llm_n_ctx,
    )


@router.post("/tag-preview", response_model=TagPreviewRead)
def tag_preview(payload: TagPreviewRequest) -> TagPreviewRead:
    content = payload.content.strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dream content is required.",
        )

    try:
        manual_tags = normalize_tag_names(payload.manual_tags)
        tags = get_tagger().generate_tags(content, additional_allowed_tags=manual_tags)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except TaggerUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return TagPreviewRead(tags=tags, generatedBy="local-sllm")
