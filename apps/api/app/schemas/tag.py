from pydantic import BaseModel

from app.core.enums import TagCategory
from app.schemas.common import ORMModel


class TagRead(ORMModel):
    id: int
    name: str
    category: TagCategory


class TagCreateRequest(BaseModel):
    name: str
    category: TagCategory = TagCategory.CUSTOM


class PopularTagRead(ORMModel):
    id: int
    name: str
    category: TagCategory
    usage_count: int
