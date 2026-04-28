from enum import Enum


class TagCategory(str, Enum):
    EMOTION = "emotion"
    EVENT = "event"
    SYMBOL = "symbol"
    RELATION = "relation"
    CUSTOM = "custom"


class BookDraftStatus(str, Enum):
    DRAFT = "draft"
    FINALIZED = "finalized"


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    RECEIVED = "received"
    CANCELLED = "cancelled"
