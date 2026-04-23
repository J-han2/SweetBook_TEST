from __future__ import annotations

import json
import logging
import re
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.constants import ALL_ALLOWED_TAGS
from app.models.tag import Tag
from app.services.tag_registry import normalize_tag_names

logger = logging.getLogger(__name__)


def _ascii_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


TAG_ALIAS_MAP = {
    _ascii_key("anxiety"): "불안",
    _ascii_key("fear"): "공포",
    _ascii_key("calm"): "평온",
    _ascii_key("peace"): "평온",
    _ascii_key("longing"): "그리움",
    _ascii_key("nostalgia"): "그리움",
    _ascii_key("confusion"): "혼란",
    _ascii_key("chaos"): "혼란",
    _ascii_key("relief"): "안도",
    _ascii_key("joy"): "기쁨",
    _ascii_key("happiness"): "기쁨",
    _ascii_key("embarrassment"): "당황",
    _ascii_key("panic"): "당황",
    _ascii_key("fall"): "추락",
    _ascii_key("falling"): "추락",
    _ascii_key("chase"): "추격",
    _ascii_key("pursuit"): "추격",
    _ascii_key("escape"): "도망",
    _ascii_key("runaway"): "도망",
    _ascii_key("flee"): "도망",
    _ascii_key("flight"): "비행",
    _ascii_key("flying"): "비행",
    _ascii_key("exam"): "시험",
    _ascii_key("test"): "시험",
    _ascii_key("late"): "지각",
    _ascii_key("tardy"): "지각",
    _ascii_key("repeat"): "반복",
    _ascii_key("repetition"): "반복",
    _ascii_key("transform"): "변신",
    _ascii_key("transformation"): "변신",
    _ascii_key("loss"): "상실",
    _ascii_key("discovery"): "발견",
    _ascii_key("discover"): "발견",
    _ascii_key("water"): "물",
    _ascii_key("fire"): "불",
    _ascii_key("door"): "문",
    _ascii_key("stairs"): "계단",
    _ascii_key("staircase"): "계단",
    _ascii_key("shadow"): "그림자",
    _ascii_key("animal"): "동물",
    _ascii_key("strangehouse"): "낯선집",
    _ascii_key("unknownhouse"): "낯선집",
    _ascii_key("school"): "학교",
    _ascii_key("sea"): "바다",
    _ascii_key("ocean"): "바다",
    _ascii_key("night"): "밤",
    _ascii_key("family"): "가족",
    _ascii_key("friend"): "친구",
    _ascii_key("friends"): "친구",
    _ascii_key("lover"): "연인",
    _ascii_key("romance"): "연인",
    _ascii_key("stranger"): "낯선사람",
    _ascii_key("childhoodfigure"): "어린시절인물",
    _ascii_key("childhoodperson"): "어린시절인물",
}

ALLOWED_TAG_GUIDE = [
    "불안 (anxiety)",
    "공포 (fear)",
    "평온 (calm)",
    "그리움 (longing, nostalgia)",
    "혼란 (confusion)",
    "안도 (relief)",
    "기쁨 (joy)",
    "당황 (embarrassment, panic)",
    "추락 (falling)",
    "추격 (chase)",
    "도망 (escape, flee)",
    "비행 (flying)",
    "시험 (exam, test)",
    "지각 (late, tardy)",
    "반복 (repeat, repetition)",
    "변신 (transform)",
    "상실 (loss)",
    "발견 (discovery)",
    "물 (water)",
    "불 (fire)",
    "문 (door)",
    "계단 (stairs)",
    "그림자 (shadow)",
    "동물 (animal)",
    "낯선집 (strange house)",
    "학교 (school)",
    "바다 (sea, ocean)",
    "밤 (night)",
    "가족 (family)",
    "친구 (friend)",
    "연인 (lover)",
    "낯선사람 (stranger)",
    "어린시절인물 (childhood figure)",
]


class TaggerUnavailableError(RuntimeError):
    pass


class LLMTagger:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._llm = None
        self._lock = Lock()

    def _load_model(self):
        if self._llm is not None:
            return self._llm

        model_path = Path(self.settings.llm_model_path)
        if not model_path.exists():
            raise TaggerUnavailableError(
                f"Local sLLM model file was not found: {model_path}. "
                "Mount a GGUF model file at the configured path before creating or updating dream entries."
            )

        try:
            from llama_cpp import Llama
        except ImportError as exc:  # pragma: no cover - package install issue
            raise TaggerUnavailableError("llama-cpp-python is not installed in the API container.") from exc

        kwargs = {
            "model_path": str(model_path),
            "n_ctx": self.settings.llm_n_ctx,
            "verbose": False,
        }
        if self.settings.llm_chat_format:
            kwargs["chat_format"] = self.settings.llm_chat_format

        self._llm = Llama(**kwargs)
        return self._llm

    def model_status(self) -> dict[str, str | bool]:
        model_path = Path(self.settings.llm_model_path)
        return {
            "available": model_path.exists(),
            "modelPath": str(model_path),
        }

    def generate_tags(self, content: str, additional_allowed_tags: list[str] | None = None) -> list[str]:
        if not content.strip():
            return []

        with self._lock:
            llm = self._load_model()
            allowed_tags = self._load_allowed_tags(additional_allowed_tags)
            literal_custom_tags = self._literal_custom_tags(content, allowed_tags)
            messages = self._build_messages(content, allowed_tags)
            raw_responses: list[str] = []
            attempts = [
                {
                    "temperature": 0.1,
                    "max_tokens": 160,
                    "response_format": {"type": "json_object"},
                },
                {
                    "temperature": 0.05,
                    "max_tokens": 220,
                },
            ]

            for attempt, options in enumerate(attempts, start=1):
                try:
                    response = llm.create_chat_completion(messages=messages, **options)
                    raw = response["choices"][0]["message"]["content"] or ""
                    raw_responses.append(raw)
                    parsed = self._merge_tags(literal_custom_tags, self._extract_tags(raw, allowed_tags))
                    if parsed:
                        return parsed
                except Exception as exc:  # pragma: no cover - llama runtime variance
                    logger.warning("LLM tagging attempt %s failed: %s", attempt, exc)

            if literal_custom_tags:
                return literal_custom_tags[:5]

            logger.warning("LLM tagging returned no valid tags. Raw responses=%s", raw_responses[:2])
            return []

    def _load_allowed_tags(self, additional_allowed_tags: list[str] | None) -> list[str]:
        allowed_tags: list[str] = []

        with SessionLocal() as session:
            persisted_tags = session.scalars(select(Tag.name).order_by(Tag.name)).all()
            for tag_name in persisted_tags:
                if tag_name not in allowed_tags:
                    allowed_tags.append(tag_name)

        for tag_name in ALL_ALLOWED_TAGS:
            if tag_name not in allowed_tags:
                allowed_tags.append(tag_name)

        for tag_name in normalize_tag_names(additional_allowed_tags):
            if tag_name not in allowed_tags:
                allowed_tags.append(tag_name)

        return allowed_tags

    def _build_messages(self, content: str, allowed_tags: list[str]) -> list[dict[str, str]]:
        known_base_tags = [line for line in ALLOWED_TAG_GUIDE if line.split(" ", 1)[0] in allowed_tags]
        custom_tags = [tag for tag in allowed_tags if tag not in ALL_ALLOWED_TAGS]
        allowed_text = "\n".join(f"- {line}" for line in known_base_tags)
        custom_text = "\n".join(f"- {tag}" for tag in custom_tags)
        system_prompt = (
            "You are a tag selector for a dream diary archive.\n"
            "The dream text may be Korean or English.\n"
            "Choose 1 to 5 tags from the allowed tags list only.\n"
            "Use the exact Korean tag values in your final answer.\n"
            "If a user-defined tag appears literally in the dream text, prefer that exact tag.\n"
            "Never output English tag names, category names, explanations, or markdown.\n"
            'Return compact JSON only in this format: {"tags":["불안","학교"]}.'
        )
        user_prompt = (
            "Allowed tags. You must output the Korean value exactly.\n"
            + f"{allowed_text}\n\n"
            + (f"User-defined tags.\n{custom_text}\n\n" if custom_text else "")
            + "Example 1\n"
            + "Dream: 학교 복도를 달리는데 시험 시간이 지났고 계단 아래에서 그림자가 따라왔다.\n"
            + 'JSON: {"tags":["불안","시험","학교","계단","그림자"]}\n\n'
            + "Example 2\n"
            + "Dream: I was flying over the sea at night with an old friend and felt calm.\n"
            + 'JSON: {"tags":["비행","바다","밤","친구","평온"]}\n\n'
            + f"Dream:\n{content}\n\n"
            + "JSON:"
        )
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _extract_tags(self, raw: str | None, allowed_tags: list[str]) -> list[str]:
        if not raw:
            return []

        for payload in self._parse_json_candidates(raw):
            tags = self._collect_tags(payload, allowed_tags)
            if tags:
                return tags

        return self._extract_tags_from_text(raw, allowed_tags)

    def _parse_json_candidates(self, raw: str) -> list[Any]:
        decoder = json.JSONDecoder()
        candidates: list[Any] = []
        for index, char in enumerate(raw):
            if char not in "[{":
                continue
            try:
                candidate, _ = decoder.raw_decode(raw[index:])
            except json.JSONDecodeError:
                continue
            candidates.append(candidate)
        return candidates

    def _collect_tags(self, payload: Any, allowed_tags: list[str]) -> list[str]:
        if isinstance(payload, dict):
            if "tags" in payload:
                return self._normalize_tag_items(payload["tags"], allowed_tags)
            for key in ("results", "items", "data"):
                if key in payload:
                    return self._normalize_tag_items(payload[key], allowed_tags)
            return []

        if isinstance(payload, list):
            return self._normalize_tag_items(payload, allowed_tags)

        return []

    def _normalize_tag_items(self, items: Any, allowed_tags: list[str]) -> list[str]:
        if not isinstance(items, list):
            return []

        normalized: list[str] = []
        for item in items:
            candidate = self._extract_candidate(item)
            if candidate is None:
                continue
            tag = self._normalize_tag(candidate, allowed_tags)
            if tag and tag not in normalized:
                normalized.append(tag)
            if len(normalized) == 5:
                break
        return normalized

    def _extract_candidate(self, value: Any) -> str | None:
        if isinstance(value, str):
            return value

        if isinstance(value, dict):
            for key in ("tag", "name", "label", "value"):
                candidate = value.get(key)
                if isinstance(candidate, str):
                    return candidate

        return None

    def _normalize_tag(self, value: str, allowed_tags: list[str]) -> str | None:
        candidate = value.strip()
        if not candidate:
            return None
        if candidate in allowed_tags:
            return candidate

        alias = TAG_ALIAS_MAP.get(_ascii_key(candidate))
        if alias in allowed_tags:
            return alias

        return None

    def _extract_tags_from_text(self, raw: str, allowed_tags: list[str]) -> list[str]:
        normalized: list[str] = []

        for tag in allowed_tags:
            if tag in raw and tag not in normalized:
                normalized.append(tag)
            if len(normalized) == 5:
                return normalized

        compact_ascii = _ascii_key(raw)
        for alias_key, tag in TAG_ALIAS_MAP.items():
            if alias_key and alias_key in compact_ascii and tag not in normalized:
                normalized.append(tag)
            if len(normalized) == 5:
                break

        return normalized

    def _literal_custom_tags(self, content: str, allowed_tags: list[str]) -> list[str]:
        normalized: list[str] = []
        lowered_content = content.lower()
        for tag in allowed_tags:
            if tag in ALL_ALLOWED_TAGS:
                continue
            if tag.lower() in lowered_content and tag not in normalized:
                normalized.append(tag)
            if len(normalized) == 5:
                break
        return normalized

    def _merge_tags(self, preferred: list[str], generated: list[str]) -> list[str]:
        merged: list[str] = []
        for tag in [*preferred, *generated]:
            if tag not in merged:
                merged.append(tag)
            if len(merged) == 5:
                break
        return merged


@lru_cache
def get_tagger() -> LLMTagger:
    return LLMTagger()
