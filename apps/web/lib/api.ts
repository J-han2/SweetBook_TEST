import {
  BookDraft,
  BookDraftListResponse,
  DreamEntryDetail,
  DreamEntryListResponse,
  Order,
  OrderListResponse,
  PopularTag,
  TagPreviewResult,
  TaggerStatus,
  Tag,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "요청을 처리하지 못했습니다.";
    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      // noop
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | Array<string | number> | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== "") {
          query.append(key, String(item));
        }
      });
      return;
    }

    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export const api = {
  listDreamEntries(params: {
    q?: string;
    tag?: string;
    tags?: string[];
    date_from?: string;
    date_to?: string;
    sort?: string;
    page?: number;
    page_size?: number;
  }) {
    return request<DreamEntryListResponse>(`/api/dream-entries${buildQuery(params)}`);
  },
  getDreamEntry(id: number) {
    return request<DreamEntryDetail>(`/api/dream-entries/${id}`);
  },
  async createDreamEntry(formData: FormData) {
    const response = await fetch(`${API_BASE_URL}/api/dream-entries`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ detail: "꿈일기를 저장하지 못했습니다." }));
      throw new Error(payload.detail ?? "꿈일기를 저장하지 못했습니다.");
    }
    return response.json() as Promise<DreamEntryDetail>;
  },
  async updateDreamEntry(id: number, formData: FormData) {
    const response = await fetch(`${API_BASE_URL}/api/dream-entries/${id}`, {
      method: "PATCH",
      body: formData,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ detail: "꿈일기를 수정하지 못했습니다." }));
      throw new Error(payload.detail ?? "꿈일기를 수정하지 못했습니다.");
    }
    return response.json() as Promise<DreamEntryDetail>;
  },
  async deleteDreamEntry(id: number) {
    return request<{ ok: boolean }>(`/api/dream-entries/${id}`, { method: "DELETE" });
  },
  listTags() {
    return request<Tag[]>("/api/tags");
  },
  popularTags() {
    return request<PopularTag[]>("/api/tags/popular");
  },
  getTaggerStatus() {
    return request<TaggerStatus>("/api/ai/tagger-status");
  },
  createTag(payload: { name: string; category?: Tag["category"] }) {
    return request<Tag>("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  previewTags(content: string, manual_tags: string[] = []) {
    return request<TagPreviewResult>("/api/ai/tag-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, manual_tags }),
    });
  },
  createBookDraft(payload: {
    title: string;
    subtitle?: string;
    cover_phrase?: string;
    cover_theme?: string;
    dream_entry_ids: number[];
  }) {
    return request<BookDraft>("/api/book-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  listBookDrafts() {
    return request<BookDraftListResponse>("/api/book-drafts");
  },
  getBookDraft(id: number) {
    return request<BookDraft>(`/api/book-drafts/${id}`);
  },
  updateBookDraft(id: number, payload: Partial<Pick<BookDraft, "title" | "subtitle" | "cover_phrase" | "cover_theme">>) {
    return request<BookDraft>(`/api/book-drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  reorderBookDraft(id: number, ordered_item_ids: number[]) {
    return request<BookDraft>(`/api/book-drafts/${id}/items/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordered_item_ids }),
    });
  },
  finalizeBookDraft(id: number) {
    return request<BookDraft>(`/api/book-drafts/${id}/finalize`, { method: "POST" });
  },
  createOrder(payload: { book_draft_id: number; quantity: number }) {
    return request<Order>("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  listOrders() {
    return request<OrderListResponse>("/api/orders");
  },
  getOrder(id: number) {
    return request<Order>(`/api/orders/${id}`);
  },
  updateOrderStatus(id: number, status: string) {
    return request<Order>(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
  exportOrderUrl(id: number) {
    return `${API_BASE_URL}/api/orders/${id}/export`;
  },
};
