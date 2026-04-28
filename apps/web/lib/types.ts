export type TagCategory = "emotion" | "event" | "symbol" | "relation" | "custom";
export type BookDraftStatus = "draft" | "finalized";
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "received" | "cancelled";

export interface Tag {
  id: number;
  name: string;
  category: TagCategory;
}

export interface PopularTag extends Tag {
  usage_count: number;
}

export interface DreamEntrySummary {
  id: number;
  title: string;
  dream_date: string;
  created_at: string;
  updated_at: string;
  representative_image_url: string | null;
  uploaded_image_url: string | null;
  is_seed: boolean;
  content_preview: string;
  tags: Tag[];
}

export interface DreamEntryDetail extends Omit<DreamEntrySummary, "content_preview"> {
  content: string;
}

export interface DreamEntryListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  items: DreamEntrySummary[];
}

export interface BookDraftItem {
  id: number;
  sort_order: number;
  dream_entry: DreamEntrySummary;
}

export interface BookDraft {
  id: number;
  title: string;
  subtitle: string | null;
  cover_phrase: string | null;
  cover_theme: string | null;
  status: BookDraftStatus;
  created_at: string;
  updated_at: string;
  items: BookDraftItem[];
}

export interface BookDraftListResponse {
  total: number;
  items: BookDraft[];
}

export interface Order {
  id: number;
  status: OrderStatus;
  quantity: number;
  recipient_name: string | null;
  recipient_phone: string | null;
  shipping_address: string | null;
  shipping_address_detail: string | null;
  export_version: string;
  created_at: string;
  updated_at: string;
  book_draft: BookDraft;
}

export interface OrderListResponse {
  total: number;
  items: Order[];
}

export interface OrderExportPayload {
  exportVersion: string;
  order: {
    id: number;
    status: OrderStatus;
    quantity: number;
    recipientName: string | null;
    recipientPhone: string | null;
    shippingAddress: string | null;
    shippingAddressDetail: string | null;
    createdAt: string;
    updatedAt: string;
  };
  book: {
    id: number;
    title: string;
    subtitle: string | null;
    coverPhrase: string | null;
    coverTheme: string | null;
    status: BookDraftStatus;
  };
  entries: Array<{
    order: number;
    id: number;
    title: string;
    dreamDate: string;
    content: string;
    representativeImageUrl: string | null;
    uploadedImageUrl: string | null;
    tags: string[];
  }>;
}

export interface TaggerStatus {
  available: boolean;
  modelPath: string;
  chatFormat: string | null;
  nCtx: number;
}

export interface TagPreviewResult {
  tags: string[];
  generatedBy: string;
}
