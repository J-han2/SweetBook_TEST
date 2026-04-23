from __future__ import annotations

from app.core.constants import DEFAULT_PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE_MAP


def build_mood_summary(tag_names: list[str]) -> str | None:
    if not tag_names:
        return "아직 선명한 태그는 없지만, 기록된 장면이 조용히 남아 있는 꿈입니다."

    emotions = [tag for tag in tag_names if tag in {"불안", "공포", "평온", "그리움", "혼란", "안도", "기쁨", "당황"}]
    events = [tag for tag in tag_names if tag in {"추락", "추격", "도망", "비행", "시험", "지각", "반복", "변신", "상실", "발견"}]
    symbols = [tag for tag in tag_names if tag in {"물", "불", "문", "계단", "그림자", "동물", "낯선집", "학교", "바다", "밤"}]

    parts: list[str] = []
    if emotions:
        parts.append(f"{', '.join(emotions[:2])}의 감정이 두드러지고")
    if events:
        parts.append(f"{', '.join(events[:2])} 장면이 반복되며")
    if symbols:
        parts.append(f"{', '.join(symbols[:2])} 이미지가 강하게 남습니다")

    summary = " ".join(parts).strip()
    return f"{summary}." if summary else f"{', '.join(tag_names[:3])}의 기운이 남는 꿈입니다."


def pick_representative_image(tag_names: list[str], uploaded_image_url: str | None) -> str:
    if uploaded_image_url:
        return uploaded_image_url

    for tag in tag_names:
        filename = PLACEHOLDER_IMAGE_MAP.get(tag)
        if filename:
            return f"/media/placeholders/{filename}"

    return f"/media/placeholders/{DEFAULT_PLACEHOLDER_IMAGE}"
