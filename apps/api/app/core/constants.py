from app.core.enums import TagCategory

TAG_CATALOG: dict[TagCategory, list[str]] = {
    TagCategory.EMOTION: ["불안", "공포", "평온", "그리움", "혼란", "안도", "기쁨", "당황"],
    TagCategory.EVENT: ["추락", "추격", "도망", "비행", "시험", "지각", "반복", "변신", "상실", "발견"],
    TagCategory.SYMBOL: ["물", "불", "문", "계단", "그림자", "동물", "낯선집", "학교", "바다", "밤"],
    TagCategory.RELATION: ["가족", "친구", "연인", "낯선사람", "어린시절인물"],
}

ALL_ALLOWED_TAGS = [tag for tags in TAG_CATALOG.values() for tag in tags]

PLACEHOLDER_IMAGE_MAP = {
    "바다": "placeholder-sea.svg",
    "물": "placeholder-sea.svg",
    "밤": "placeholder-night.svg",
    "그림자": "placeholder-shadow.svg",
    "문": "placeholder-door.svg",
    "계단": "placeholder-stairs.svg",
    "학교": "placeholder-school.svg",
    "동물": "placeholder-animal.svg",
    "비행": "placeholder-flight.svg",
    "추격": "placeholder-chase.svg",
    "추락": "placeholder-fall.svg",
}

DEFAULT_PLACEHOLDER_IMAGE = "placeholder-archive.svg"
COVER_THEMES = ["midnight-blue", "starlit-plum", "cream-dusk", "emerald-night"]
