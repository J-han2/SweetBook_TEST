from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel):
    total: int
    page: int = 1
    page_size: int = 20
    total_pages: int = 1
    has_next: bool = False
    has_previous: bool = False
