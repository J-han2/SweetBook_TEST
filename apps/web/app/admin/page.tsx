"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { AdminOrder, ExportStatus, OrderStatus } from "@/lib/types";

// ────────────────────────────────────────────────────────────
// Constants & helpers
// ────────────────────────────────────────────────────────────

const ADMIN_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:    "주문 전",
  confirmed:  "주문 확인 중",
  processing: "제작 중",
  shipped:    "제작 완료",
  received:   "수령 확인",
  cancelled:  "주문 취소",
};

const EXPORT_LABELS: Record<ExportStatus, string> = {
  pending:    "미추출",
  processing: "추출 중",
  completed:  "추출 완료",
  failed:     "추출 실패",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:    "bg-amber-50 text-amber-700 border-amber-200",
  confirmed:  "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-purple-50 text-purple-700 border-purple-200",
  shipped:    "bg-green-50 text-green-700 border-green-200",
  received:   "bg-teal-50 text-teal-700 border-teal-200",
  cancelled:  "bg-red-50 text-red-700 border-red-200",
};

const EXPORT_COLORS: Record<ExportStatus, string> = {
  pending:    "bg-gray-50 text-gray-500 border-gray-200",
  processing: "bg-blue-50 text-blue-600 border-blue-200",
  completed:  "bg-green-50 text-green-700 border-green-200",
  failed:     "bg-red-50 text-red-600 border-red-200",
};

type Tab = "confirmed" | "processing" | "completed" | "stats";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {ADMIN_STATUS_LABELS[status]}
    </span>
  );
}

function ExportBadge({ status }: { status: ExportStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${EXPORT_COLORS[status]}`}>
      {EXPORT_LABELS[status]}
    </span>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3 text-sm text-white shadow-lg">
      <span>{message}</span>
      <button type="button" onClick={onClose} className="ml-2 text-gray-400 hover:text-white">✕</button>
    </div>
  );
}

function OrderDetailModal({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [memo, setMemo] = useState(order.admin_memo ?? "");
  const [memoSaved, setMemoSaved] = useState(false);

  const memoMutation = useMutation({
    mutationFn: () => api.adminUpdateMemo(order.id, memo || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 2000);
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => api.adminRetryExport(order.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">주문 상세 — #{order.id}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-5 p-6">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">주문일</span><p className="mt-1 font-medium">{new Date(order.created_at).toLocaleString("ko-KR")}</p></div>
            <div><span className="text-gray-500">주문 상태</span><p className="mt-1"><StatusBadge status={order.status} /></p></div>
            <div><span className="text-gray-500">수령인</span><p className="mt-1 font-medium">{order.recipient_name ?? "—"}</p></div>
            <div><span className="text-gray-500">전화번호</span><p className="mt-1 font-medium">{order.recipient_phone ?? "—"}</p></div>
            <div className="col-span-2"><span className="text-gray-500">배송지</span><p className="mt-1 font-medium">{order.shipping_address ?? "—"} {order.shipping_address_detail ?? ""}</p></div>
            <div><span className="text-gray-500">수량</span><p className="mt-1 font-medium">{order.quantity}권</p></div>
            <div><span className="text-gray-500">메타데이터 추출</span><p className="mt-1"><ExportBadge status={order.export_status} /></p></div>
          </div>

          {/* Book info */}
          <div className="rounded-xl bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-700">📚 {order.book_draft.title}</p>
            {order.book_draft.subtitle && <p className="mt-1 text-gray-500">{order.book_draft.subtitle}</p>}
            <p className="mt-2 text-gray-500">꿈 {order.book_draft.items.length}개 포함</p>
            <ul className="mt-2 space-y-1">
              {order.book_draft.items.slice(0, 5).map((item) => (
                <li key={item.id} className="text-gray-600">• {item.dream_entry.title}</li>
              ))}
              {order.book_draft.items.length > 5 && (
                <li className="text-gray-400">외 {order.book_draft.items.length - 5}개...</li>
              )}
            </ul>
          </div>

          {/* Export error */}
          {order.export_error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">추출 실패 사유</p>
              <p className="mt-1">{order.export_error}</p>
              <button
                type="button"
                onClick={() => retryMutation.mutate()}
                disabled={retryMutation.isPending}
                className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {retryMutation.isPending ? "재시도 중..." : "재시도"}
              </button>
            </div>
          )}

          {/* Status history */}
          {order.status_history.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">상태 변경 이력</p>
              <div className="space-y-2">
                {[...order.status_history].reverse().map((h) => (
                  <div key={h.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 min-w-[130px] text-gray-400">{new Date(h.changed_at).toLocaleString("ko-KR")}</span>
                    <span className="text-gray-500">{h.from_status ? ADMIN_STATUS_LABELS[h.from_status as OrderStatus] ?? h.from_status : "—"} → {ADMIN_STATUS_LABELS[h.to_status as OrderStatus] ?? h.to_status}</span>
                    {h.note && <span className="text-gray-400">({h.note})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin memo */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">관리자 메모</p>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
              rows={3}
              placeholder="메모를 입력하세요..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            <button
              type="button"
              onClick={() => memoMutation.mutate()}
              disabled={memoMutation.isPending}
              className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {memoSaved ? "저장됨 ✓" : memoMutation.isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Order Table
// ────────────────────────────────────────────────────────────

function OrderTable({
  orders,
  selected,
  onToggle,
  onToggleAll,
  onDetail,
  showExportDownload,
  downloadUrls,
}: {
  orders: AdminOrder[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onDetail: (order: AdminOrder) => void;
  showExportDownload?: boolean;
  downloadUrls?: Record<number, string>;
}) {
  const allSelected = orders.length > 0 && orders.every((o) => selected.has(o.id));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-4 py-3">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="h-4 w-4 rounded border-gray-300" />
            </th>
            <th className="px-4 py-3 text-left">주문번호</th>
            <th className="px-4 py-3 text-left">주문일</th>
            <th className="px-4 py-3 text-left">책 제목</th>
            <th className="px-4 py-3 text-left">수령인</th>
            <th className="px-4 py-3 text-left">전화번호</th>
            <th className="px-4 py-3 text-left">배송지</th>
            <th className="px-4 py-3 text-left">주문상태</th>
            <th className="px-4 py-3 text-left">추출상태</th>
            <th className="px-4 py-3 text-left">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => (
            <tr key={order.id} className={`transition hover:bg-gray-50 ${selected.has(order.id) ? "bg-indigo-50" : ""}`}>
              <td className="px-4 py-3">
                <input type="checkbox" checked={selected.has(order.id)} onChange={() => onToggle(order.id)} className="h-4 w-4 rounded border-gray-300" />
              </td>
              <td className="px-4 py-3 font-mono text-gray-500">#{order.id}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{new Date(order.created_at).toLocaleDateString("ko-KR")}</td>
              <td className="max-w-[160px] truncate px-4 py-3 font-medium text-gray-900">{order.book_draft.title}</td>
              <td className="px-4 py-3 text-gray-700">{order.recipient_name ?? <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-3 text-gray-600">{order.recipient_phone ?? <span className="text-gray-300">—</span>}</td>
              <td className="max-w-[180px] truncate px-4 py-3 text-gray-600">{order.shipping_address ?? <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
              <td className="px-4 py-3"><ExportBadge status={order.export_status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onDetail(order)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100">
                    상세
                  </button>
                  {showExportDownload && downloadUrls?.[order.id] && (
                    <a href={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}${downloadUrls[order.id]}`} download className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100">
                      다운로드
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && (
        <div className="py-16 text-center text-sm text-gray-400">조건에 맞는 주문이 없습니다.</div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Stats Section
// ────────────────────────────────────────────────────────────

function StatsSection() {
  const statsQuery = useQuery({ queryKey: ["admin-stats"], queryFn: api.adminGetStats });
  const stats = statsQuery.data;

  const cards = [
    { label: "전체 주문", value: stats?.total_orders ?? "—", color: "text-gray-800" },
    { label: "주문 확인 중", value: stats?.confirmed_orders ?? "—", color: "text-blue-600" },
    { label: "제작 중", value: stats?.processing_orders ?? "—", color: "text-purple-600" },
    { label: "제작 완료", value: stats?.shipped_orders ?? "—", color: "text-green-600" },
    { label: "수령 확인", value: stats?.received_orders ?? "—", color: "text-teal-600" },
    { label: "주문 취소", value: stats?.cancelled_orders ?? "—", color: "text-red-500" },
    { label: "전체 꿈 기록", value: stats?.total_dreams ?? "—", color: "text-gray-700" },
    { label: "추출 완료", value: stats?.export_completed ?? "—", color: "text-green-600" },
    { label: "추출 실패", value: stats?.export_failed ?? "—", color: "text-red-500" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-medium text-gray-400">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {stats?.popular_tags && stats.popular_tags.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">인기 태그 TOP 10</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs font-medium uppercase text-gray-400">
                <tr>
                  <th className="pb-2 pr-6 text-left">순위</th>
                  <th className="pb-2 pr-6 text-left">태그</th>
                  <th className="pb-2 pr-6 text-left">카테고리</th>
                  <th className="pb-2 text-right">사용 횟수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.popular_tags.map((tag, i) => (
                  <tr key={tag.name}>
                    <td className="py-2 pr-6 text-gray-400">#{i + 1}</td>
                    <td className="py-2 pr-6 font-medium text-gray-800">#{tag.name}</td>
                    <td className="py-2 pr-6 text-gray-500">{tag.category}</td>
                    <td className="py-2 text-right font-mono text-gray-700">{tag.usage_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Order Panel (shared by confirmed / processing / completed tabs)
// ────────────────────────────────────────────────────────────

function OrderPanel({
  statusFilters,
  bulkToStatus,
  bulkLabel,
  showExport,
  secondaryBulkToStatus,
  secondaryBulkLabel,
}: {
  statusFilters: OrderStatus[];
  bulkToStatus?: OrderStatus;
  bulkLabel?: string;
  showExport?: boolean;
  secondaryBulkToStatus?: OrderStatus;
  secondaryBulkLabel?: string;
}) {
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("created_at_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);
  const [confirm, setConfirm] = useState<{ type: "status" | "export"; label: string; toStatus?: OrderStatus } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<Record<number, string>>({});

  const queryKey = ["admin-orders", statusFilters, appliedQ, dateFrom, dateTo, sort, page, pageSize];
  const ordersQuery = useQuery({
    queryKey,
    queryFn: () =>
      api.adminListOrders({
        status: statusFilters,
        q: appliedQ || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort,
        page,
        page_size: pageSize,
      }),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ toStatus }: { toStatus: OrderStatus }) =>
      api.adminBulkStatus(Array.from(selected), toStatus),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelected(new Set());
      setToast(`완료: 성공 ${result.success_count}건 / 실패 ${result.failure_count}건`);
    },
  });

  const bulkExportMutation = useMutation({
    mutationFn: () => api.adminBulkExport(Array.from(selected)),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      const urlMap: Record<number, string> = {};
      result.download_urls.forEach((d) => { urlMap[d.order_id] = d.url; });
      setDownloadUrls((prev) => ({ ...prev, ...urlMap }));
      setToast(
        result.failure_count > 0
          ? `추출 완료: ${result.success_count}건 성공, ${result.failure_count}건 실패 (${result.failures.map((f) => `#${f.order_id}`).join(", ")})`
          : `추출 완료: ${result.success_count}건 성공`,
      );
    },
  });

  const orders = ordersQuery.data?.items ?? [];
  const totalPages = ordersQuery.data?.total_pages ?? 1;
  const total = ordersQuery.data?.total ?? 0;

  function toggleAll() {
    if (orders.every((o) => selected.has(o.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  }

  function applySearch() {
    setAppliedQ(q);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">검색 (주문번호 / 수령인 / 전화번호)</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            placeholder="검색어"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">주문일 시작</label>
          <input type="date" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">주문일 종료</label>
          <input type="date" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">정렬</label>
          <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="created_at_desc">최신순</option>
            <option value="created_at_asc">오래된순</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">페이지 크기</label>
          <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}개</option>)}
          </select>
        </div>
        <button type="button" onClick={applySearch} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">검색</button>
        <a href={api.adminCsvUrl({ status: statusFilters, q: appliedQ || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined })} download className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          CSV
        </a>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm">
          <span className="font-medium text-indigo-700">{selected.size}건 선택됨</span>
          {bulkToStatus && bulkLabel && (
            <button
              type="button"
              onClick={() => setConfirm({ type: "status", label: bulkLabel, toStatus: bulkToStatus })}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
            >
              {bulkLabel}
            </button>
          )}
          {secondaryBulkToStatus && secondaryBulkLabel && (
            <button
              type="button"
              onClick={() => setConfirm({ type: "status", label: secondaryBulkLabel, toStatus: secondaryBulkToStatus })}
              className="rounded-lg bg-green-600 px-3 py-1.5 font-medium text-white hover:bg-green-700"
            >
              {secondaryBulkLabel}
            </button>
          )}
          {showExport && (
            <button
              type="button"
              onClick={() => setConfirm({ type: "export", label: "데이터 추출" })}
              className="rounded-lg bg-purple-600 px-3 py-1.5 font-medium text-white hover:bg-purple-700"
            >
              데이터 추출
            </button>
          )}
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-indigo-400 hover:text-indigo-700">선택 해제</button>
        </div>
      )}

      {/* Table */}
      {ordersQuery.isLoading ? (
        <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : ordersQuery.isError ? (
        <div className="py-10 text-center text-sm text-red-500">데이터를 불러오지 못했습니다.</div>
      ) : (
        <OrderTable
          orders={orders}
          selected={selected}
          onToggle={(id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          onToggleAll={toggleAll}
          onDetail={setDetailOrder}
          showExportDownload={showExport}
          downloadUrls={downloadUrls}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>총 {total}건</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50">이전</button>
            <span>{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50">다음</button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.type === "export" ? "데이터 추출" : confirm.label}
          description={
            confirm.type === "export"
              ? `선택한 ${selected.size}건의 주문에 대해 메타데이터를 추출합니다.`
              : `선택한 ${selected.size}건의 주문 상태를 "${confirm.label}"로 변경합니다.`
          }
          confirmLabel={confirm.type === "export" ? "추출 시작" : "변경"}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === "export") {
              bulkExportMutation.mutate();
            } else if (confirm.toStatus) {
              bulkStatusMutation.mutate({ toStatus: confirm.toStatus });
            }
            setConfirm(null);
          }}
        />
      )}

      {/* Detail modal */}
      {detailOrder && <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}

      {/* Toast */}
      {toast && <ResultToast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Admin Page
// ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("confirmed");

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "confirmed",  label: "주문 확인" },
    { key: "processing", label: "메타데이터 추출" },
    { key: "completed",  label: "완료 주문" },
    { key: "stats",      label: "통계 / 리더보드" },
  ];

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/orders" className="text-sm text-gray-400 hover:text-gray-600">← My Books</Link>
            <h1 className="text-lg font-bold text-gray-900">관리자 페이지</h1>
          </div>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">Admin</span>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "confirmed" && (
          <OrderPanel
            statusFilters={["confirmed"]}
            bulkToStatus="processing"
            bulkLabel="제작 중으로 변경"
          />
        )}

        {tab === "processing" && (
          <OrderPanel
            statusFilters={["processing"]}
            showExport
            secondaryBulkToStatus="shipped"
            secondaryBulkLabel="제작 완료로 변경"
          />
        )}

        {tab === "completed" && (
          <OrderPanel
            statusFilters={["shipped", "received"]}
          />
        )}

        {tab === "stats" && <StatsSection />}
      </main>
    </div>
  );
}
