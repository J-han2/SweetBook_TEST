import { BookDraftStatus, OrderStatus } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const COVER_THEMES = [
  { value: "midnight-blue", label: "한밤의 푸른빛" },
  { value: "starlit-plum", label: "별빛 자두빛" },
  { value: "cream-dusk", label: "크림 노을" },
  { value: "emerald-night", label: "에메랄드 밤" },
] as const;

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function bookDraftStatusLabel(status: BookDraftStatus) {
  return status === "finalized" ? "확정됨" : "초안";
}

export function orderStatusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    pending: "주문 전",
    confirmed: "주문 확인 중",
    processing: "제작 중",
    shipped: "발송 완료",
    received: "수령 완료",
    cancelled: "주문 취소",
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
      return "from-[#e7e4fb] via-[#d3dcf3] to-[#efe9e2]";
    case "starlit-plum":
      return "from-[#8f87b1] via-[#c6afd1] to-[#efe3ea]";
    case "cream-dusk":
      return "from-[#f5eedf] via-[#e9ddd8] to-[#dde4e5]";
    case "emerald-night":
      return "from-[#e5efe3] via-[#bfd1c2] to-[#f4eee4]";
    default:
      return "from-[#f1eafb] via-[#ede3ea] to-[#f8f3eb]";
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
