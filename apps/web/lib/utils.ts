import { BookDraftStatus, OrderStatus, TagCategory } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function categoryLabel(category: TagCategory) {
  const labels: Record<TagCategory, string> = {
    emotion: "감정",
    event: "상황",
    symbol: "상징",
    relation: "관계",
    custom: "사용자",
  };
  return labels[category];
}

export function bookDraftStatusLabel(status: BookDraftStatus) {
  return status === "finalized" ? "확정됨" : "초안";
}

export function orderStatusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    pending: "주문 대기",
    processing: "작업 중",
    completed: "완료",
    cancelled: "취소됨",
  };
  return labels[status];
}

export function themeLabel(value: string | null) {
  const labels: Record<string, string> = {
    "midnight-blue": "한밤의 푸른빛",
    "starlit-plum": "별빛 자두빛",
    "cream-dusk": "크림 노을",
    "emerald-night": "에메랄드 밤",
  };
  return value ? labels[value] ?? value : "미정";
}

export function coverThemeClasses(value: string | null | undefined) {
  switch (value) {
    case "midnight-blue":
      return "from-[#dbd7fb] via-[#b7c8f0] to-[#f4ebdf]";
    case "starlit-plum":
      return "from-[#7f75a7] via-[#b899c7] to-[#ead9e5]";
    case "cream-dusk":
      return "from-[#f4ecd7] via-[#e5d7d1] to-[#d4dddf]";
    case "emerald-night":
      return "from-[#dcebdc] via-[#aec6b5] to-[#f2eadf]";
    default:
      return "from-[#ede5fb] via-[#e9dde8] to-[#f7f1e8]";
  }
}

export function resolveMediaUrl(value: string | null | undefined, fallback = "/placeholder.svg") {
  if (!value) {
    return fallback;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  if (value.startsWith("/media/")) {
    return `${API_BASE_URL}${value}`;
  }

  return value;
}
