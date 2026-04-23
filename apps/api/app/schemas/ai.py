from pydantic import BaseModel, Field


class TaggerStatusRead(BaseModel):
    available: bool
    modelPath: str
    chatFormat: str | None
    nCtx: int


class TagPreviewRequest(BaseModel):
    content: str
    manual_tags: list[str] = Field(default_factory=list)


class TagPreviewRead(BaseModel):
    tags: list[str]
    generatedBy: str
