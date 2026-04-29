import {
  AdminOrder,
  AdminOrderListResponse,
  AdminStats,
  BookDraft,
  BookDraftListResponse,
  BulkExportResult,
  BulkStatusChangeResult,
  DreamEntryDetail,
  DreamEntryListResponse,
  Order,
  OrderListResponse,
  OrderStatus,
  Tag,
  TagPreviewResult,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "요청을 처리하지 못했어요.";

    try {
      const payload = await response.json();
      if (Array.isArray(payload.detail)) {
        detail = payload.detail
          .map((item: { msg?: string }) => item?.msg)
          .filter(Boolean)
          .join("\n");
      } else if (typeof payload.detail === "string") {
        detail = payload.detail;
      }
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
      const payload = await response.json().catch(() => ({ detail: "꿈 기록을 저장하지 못했어요." }));
      throw new Error(payload.detail ?? "꿈 기록을 저장하지 못했어요.");
    }

    return response.json() as Promise<DreamEntryDetail>;
  },
  async updateDreamEntry(id: number, formData: FormData) {
    const response = await fetch(`${API_BASE_URL}/api/dream-entries/${id}`, {
      method: "PATCH",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ detail: "꿈 기록을 수정하지 못했어요." }));
      throw new Error(payload.detail ?? "꿈 기록을 수정하지 못했어요.");
    }

    return response.json() as Promise<DreamEntryDetail>;
  },
  async deleteDreamEntry(id: number) {
    return request<{ ok: boolean }>(`/api/dream-entries/${id}`, { method: "DELETE" });
  },
  listTags() {
    return request<Tag[]>("/api/tags");
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
  addBookDraftItem(id: number, dream_entry_id: number) {
    return request<BookDraft>(`/api/book-drafts/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dream_entry_id }),
    });
  },
  removeBookDraftItem(id: number, item_id: number) {
    return request<BookDraft>(`/api/book-drafts/${id}/items/${item_id}`, {
      method: "DELETE",
    });
  },
  finalizeBookDraft(id: number) {
    return request<BookDraft>(`/api/book-drafts/${id}/finalize`, { method: "POST" });
  },
  createOrder(payload: { book_draft_id: number }) {
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
  updateOrder(
    id: number,
    payload: {
      quantity?: number;
      recipient_name?: string;
      recipient_phone?: string;
      shipping_address?: string;
      shipping_address_detail?: string;
    },
  ) {
    return request<Order>(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  confirmOrder(
    id: number,
    payload: {
      quantity: number;
      recipient_name: string;
      recipient_phone: string;
      shipping_address: string;
      shipping_address_detail?: string;
    },
  ) {
    return request<Order>(`/api/orders/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  receiveOrder(id: number) {
    return request<Order>(`/api/orders/${id}/receive`, {
      method: "POST",
    });
  },
  cancelOrder(id: number) {
    return request<Order>(`/api/orders/${id}/cancel`, {
      method: "POST",
    });
  },

  // Admin APIs
  adminListOrders(params: {
    status?: OrderStatus[];
    q?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
    page?: number;
    page_size?: number;
  }) {
    return request<AdminOrderListResponse>(`/api/admin/orders${buildQuery(params)}`);
  },
  adminBulkStatus(order_ids: number[], to_status: OrderStatus, note?: string) {
    return request<BulkStatusChangeResult>("/api/admin/orders/bulk-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids, to_status, note }),
    });
  },
  adminBulkExport(order_ids: number[]) {
    return request<BulkExportResult>("/api/admin/orders/bulk-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids }),
    });
  },
  adminRetryExport(id: number) {
    return request<AdminOrder>(`/api/admin/orders/${id}/retry-export`, { method: "POST" });
  },
  adminUpdateMemo(id: number, memo: string | null) {
    return request<AdminOrder>(`/api/admin/orders/${id}/memo`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo }),
    });
  },
  adminGetStats() {
    return request<AdminStats>("/api/admin/stats");
  },
  adminCsvUrl(params: { status?: OrderStatus[]; q?: string; date_from?: string; date_to?: string }) {
    return `${API_BASE_URL}/api/admin/orders/export/csv${buildQuery(params)}`;
  },
};
