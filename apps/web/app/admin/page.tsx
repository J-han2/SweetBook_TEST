"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { AdminOrder, OrderStatus } from "@/lib/types";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "주문 전",
  confirmed: "주문 확인 중",
  processing: "제작 중",
  shipped: "제작 완료",
  received: "수령 확인",
  cancelled: "주문 취소",
};

const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-sky-200 bg-sky-50 text-sky-700",
  processing: "border-violet-200 bg-violet-50 text-violet-700",
  shipped: "border-emerald-200 bg-emerald-50 text-emerald-700",
  received: "border-teal-200 bg-teal-50 text-teal-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

type TabKey = "confirmed" | "processing" | "completed" | "all" | "stats";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function formatAddress(order: Pick<AdminOrder, "shipping_address" | "shipping_address_detail">) {
  return [order.shipping_address, order.shipping_address_detail].filter(Boolean).join(" ");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${STATUS_BADGE_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function statusActionLabel(status: OrderStatus) {
  if (status === "confirmed") {
    return "주문 접수";
  }
  if (status === "processing") {
    return "제작 완료";
  }
  return "";
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  confirmTone = "indigo",
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone?: "indigo" | "emerald";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmClass =
    confirmTone === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-indigo-600 hover:bg-indigo-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-gray-500">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
      <span>{message}</span>
      <button type="button" onClick={onClose} className="text-white/60 transition hover:text-white">
        닫기
      </button>
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [memo, setMemo] = useState(order.admin_memo ?? "");
  const [saved, setSaved] = useState(false);

  const memoMutation = useMutation({
    mutationFn: () => api.adminUpdateMemo(order.id, memo || null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    },
  });

  const orderedItems = [...order.book_draft.items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4 pt-10">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Order detail</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">주문 #{order.id}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 transition hover:text-gray-900">
            닫기
          </button>
        </div>

        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="space-y-6">
            <div className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">상태</p>
                <div className="mt-3">
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">주문일</p>
                <p className="mt-3 text-sm font-medium text-gray-700">{formatDateTime(order.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">수령인</p>
                <p className="mt-3 text-sm font-medium text-gray-700">{order.recipient_name || "미입력"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">전화번호</p>
                <p className="mt-3 text-sm font-medium text-gray-700">{order.recipient_phone || "미입력"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">배송지</p>
                <p className="mt-3 text-sm font-medium text-gray-700">{formatAddress(order) || "미입력"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">책 정보</p>
              <h3 className="mt-3 text-2xl font-semibold text-gray-900">{order.book_draft.title}</h3>
              {order.book_draft.subtitle ? (
                <p className="mt-2 text-sm text-gray-500">{order.book_draft.subtitle}</p>
              ) : null}
              <p className="mt-4 text-sm text-gray-500">수량 {order.quantity}권 · 꿈 {order.book_draft.items.length}개</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">포함된 꿈</p>
              <div className="mt-4 space-y-3">
                {orderedItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-400">#{item.sort_order}</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">{item.dream_entry.title}</p>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(item.dream_entry.dream_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">상태 변경 이력</p>
              <div className="mt-4 space-y-3">
                {order.status_history.length > 0 ? (
                  [...order.status_history]
                    .sort((a, b) => +new Date(b.changed_at) - +new Date(a.changed_at))
                    .map((history) => (
                      <div key={history.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-400">{formatDateTime(history.changed_at)}</p>
                        <p className="mt-1 text-sm font-medium text-gray-700">
                          {(history.from_status && STATUS_LABELS[history.from_status as OrderStatus]) || "시작"} →{" "}
                          {STATUS_LABELS[history.to_status as OrderStatus] ?? history.to_status}
                        </p>
                        {history.note ? <p className="mt-1 text-xs text-gray-500">{history.note}</p> : null}
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-gray-400">아직 기록된 상태 변경 이력이 없어요.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">관리자 메모</p>
              <textarea
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                rows={6}
                className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 text-gray-700 outline-none transition focus:border-indigo-400"
                placeholder="관리자 메모를 입력하세요."
              />
              <button
                type="button"
                onClick={() => memoMutation.mutate()}
                disabled={memoMutation.isPending}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {saved ? "저장됨" : memoMutation.isPending ? "저장 중..." : "메모 저장"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({
  title,
  data,
  tone = "indigo",
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  tone?: "indigo" | "emerald" | "sky";
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const barClass =
    tone === "emerald"
      ? "bg-emerald-500/80"
      : tone === "sky"
        ? "bg-sky-500/80"
        : "bg-indigo-500/80";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {data.length > 0 ? (
        <div className="mt-5 space-y-3">
          {data.map((item) => (
            <div key={item.label} className="grid grid-cols-[96px_minmax(0,1fr)_48px] items-center gap-3">
              <span className="truncate text-xs text-gray-500">{item.label}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${barClass}`}
                  style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)}%` }}
                />
              </div>
              <span className="text-right text-xs font-semibold text-gray-600">{item.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-400">표시할 데이터가 없어요.</p>
      )}
    </div>
  );
}

function StatsSection() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const statsQuery = useQuery({
    queryKey: ["admin-stats", dateFrom, dateTo],
    queryFn: () => api.adminGetStats({ date_from: dateFrom || undefined, date_to: dateTo || undefined }),
  });

  const stats = statsQuery.data;
  const cards = stats
    ? [
        { label: "전체 주문", value: stats.total_orders, tone: "text-gray-900" },
        { label: "주문 전", value: stats.pending_orders, tone: "text-amber-700" },
        { label: "주문 확인 중", value: stats.confirmed_orders, tone: "text-sky-700" },
        { label: "제작 중", value: stats.processing_orders, tone: "text-violet-700" },
        { label: "제작 완료", value: stats.shipped_orders, tone: "text-emerald-700" },
        { label: "수령 확인", value: stats.received_orders, tone: "text-teal-700" },
        { label: "주문 취소", value: stats.cancelled_orders, tone: "text-rose-700" },
        { label: "전체 꿈 기록", value: stats.total_dreams, tone: "text-gray-700" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Statistics</p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900">주문 통계와 진행 현황</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm text-gray-500">
              <span className="mb-1 block text-xs font-medium text-gray-400">시작일</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-400"
              />
            </label>
            <label className="text-sm text-gray-500">
              <span className="mb-1 block text-xs font-medium text-gray-400">종료일</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-400"
              />
            </label>
          </div>
        </div>
      </div>

      {statsQuery.isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center text-sm text-gray-400">통계 데이터를 불러오는 중이에요.</div>
      ) : statsQuery.isError || !stats ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-14 text-center text-sm text-rose-500">통계 데이터를 불러오지 못했어요.</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{card.label}</p>
                <p className={`mt-3 text-3xl font-semibold ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <MiniBarChart title="일별 주문 수" data={stats.daily_orders} tone="indigo" />
            </div>
            <MiniBarChart title="상태별 주문 분포" data={stats.status_breakdown.map(({ label, value }) => ({ label, value }))} tone="emerald" />
          </div>

          <MiniBarChart title="월별 주문 수" data={stats.monthly_orders} tone="sky" />
        </>
      )}
    </div>
  );
}

function OrderTable({
  orders,
  selectedIds,
  onToggle,
  onToggleAll,
  onOpenDetail,
  onAction,
  onExport,
}: {
  orders: AdminOrder[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onOpenDetail: (order: AdminOrder) => void;
  onAction: (order: AdminOrder, toStatus: OrderStatus, label: string) => void;
  onExport: (orderIds: number[]) => void;
}) {
  const allSelected = orders.length > 0 && orders.every((order) => selectedIds.has(order.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <table className="min-w-full table-fixed text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          <tr>
            <th className="w-14 px-4 py-3">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="h-4 w-4 rounded border-gray-300" />
            </th>
            <th className="w-28 px-4 py-3">주문 번호</th>
            <th className="w-48 px-4 py-3">주문일</th>
            <th className="w-72 px-4 py-3">책 제목</th>
            <th className="w-32 px-4 py-3">수령인</th>
            <th className="w-48 px-4 py-3">전화번호</th>
            <th className="w-[22rem] px-4 py-3">배송지</th>
            <th className="w-36 px-4 py-3">상태</th>
            <th className="w-64 px-4 py-3">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => {
            const primaryAction =
              order.status === "confirmed" ? (
                <button
                  type="button"
                  onClick={() => onAction(order, "processing", statusActionLabel("confirmed"))}
                  className="rounded-xl bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-indigo-700"
                >
                  {statusActionLabel("confirmed")}
                </button>
              ) : order.status === "processing" ? (
                <button
                  type="button"
                  onClick={() => onAction(order, "shipped", statusActionLabel("processing"))}
                  className="rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-emerald-700"
                >
                  {statusActionLabel("processing")}
                </button>
              ) : null;

            return (
              <tr key={order.id} className="transition hover:bg-gray-50">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(order.id)}
                    onChange={() => onToggle(order.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-4 font-mono text-gray-500">#{order.id}</td>
                <td className="px-4 py-4 whitespace-nowrap text-gray-600">{formatDate(order.created_at)}</td>
                <td className="px-4 py-4">
                  <p className="line-clamp-2 font-semibold text-gray-900">{order.book_draft.title}</p>
                  {order.book_draft.subtitle ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{order.book_draft.subtitle}</p> : null}
                </td>
                <td className="px-4 py-4 break-keep text-gray-700">{order.recipient_name || "미입력"}</td>
                <td className="px-4 py-4 whitespace-nowrap text-gray-600">{order.recipient_phone || "미입력"}</td>
                <td className="px-4 py-4 text-gray-600">
                  <p className="whitespace-normal break-keep leading-6">{formatAddress(order) || "미입력"}</p>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-4 align-middle">
                  <div className="flex min-w-[220px] items-center justify-end gap-2">
                    {primaryAction}
                    <div className="flex items-center justify-end gap-2">
                      {order.status === "processing" ? (
                        <button
                          type="button"
                          onClick={() => onExport([order.id])}
                          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap text-gray-700 transition hover:bg-gray-50"
                        >
                          데이터 추출
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onOpenDetail(order)}
                        className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap text-gray-700 transition hover:bg-gray-50"
                      >
                        주문 상세
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {orders.length === 0 ? (
        <div className="px-6 py-14 text-center text-sm text-gray-400">조건에 맞는 주문이 없어요.</div>
      ) : null}
    </div>
  );
}

function AdminOrderPanel({
  title,
  description,
  statusFilters,
}: {
  title: string;
  description: string;
  statusFilters: OrderStatus[];
}) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("created_at_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    orderIds: number[];
    label: string;
    mode: "status" | "export";
    toStatus?: OrderStatus;
  } | null>(null);

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

  const orders = ordersQuery.data?.items ?? [];
  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.has(order.id)),
    [orders, selectedIds],
  );

  const bulkStatusMutation = useMutation({
    mutationFn: ({ orderIds, toStatus }: { orderIds: number[]; toStatus: OrderStatus }) =>
      api.adminBulkStatus(orderIds, toStatus),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelectedIds(new Set());
      setToast(`상태 변경 완료: 성공 ${result.success_count}건 / 실패 ${result.failure_count}건`);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      const blob = await api.adminExportArchive(orderIds);
      const filename =
        orderIds.length === 1
          ? `dreamarchive-order-${orderIds[0]}.zip`
          : `dreamarchive-orders-${new Date().toISOString().slice(0, 10)}.zip`;
      downloadBlob(blob, filename);
      return orderIds.length;
    },
    onSuccess: (count) => {
      setSelectedIds(new Set());
      setToast(`${count}건의 주문 데이터를 하나의 ZIP 파일로 추출했어요.`);
    },
  });

  const canBulkMoveToProcessing =
    selectedOrders.length > 0 && selectedOrders.every((order) => order.status === "confirmed");
  const canBulkMoveToShipped =
    selectedOrders.length > 0 && selectedOrders.every((order) => order.status === "processing");
  const canBulkExport =
    selectedOrders.length > 0 && selectedOrders.every((order) => order.status === "processing");

  function applySearch() {
    setAppliedQ(q);
    setPage(1);
  }

  function toggleAll() {
    if (orders.length > 0 && orders.every((order) => selectedIds.has(order.id))) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(orders.map((order) => order.id)));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 text-sm text-gray-500">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">검색</span>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearch();
                }
              }}
              placeholder="주문 번호, 수령인, 전화번호, 책 제목"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-indigo-400"
            />
          </label>
          <label className="text-sm text-gray-500">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">시작일</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-400"
            />
          </label>
          <label className="text-sm text-gray-500">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">종료일</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-400"
            />
          </label>
          <label className="text-sm text-gray-500">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">정렬</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-400"
            >
              <option value="created_at_desc">최신순</option>
              <option value="created_at_asc">오래된순</option>
            </select>
          </label>
          <label className="text-sm text-gray-500">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">페이지 크기</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-400"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}개 보기
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={applySearch}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            검색
          </button>
          <a
            href={api.adminCsvUrl({
              status: statusFilters,
              q: appliedQ || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            })}
            download
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            CSV 다운로드
          </a>
        </div>
      </div>

      {selectedOrders.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          <span className="font-semibold">{selectedOrders.length}건 선택됨</span>
          {canBulkMoveToProcessing ? (
            <button
              type="button"
              onClick={() =>
                setConfirmState({
                  orderIds: selectedOrders.map((order) => order.id),
                  label: statusActionLabel("confirmed"),
                  mode: "status",
                  toStatus: "processing",
                })
              }
               className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold whitespace-nowrap text-white transition hover:bg-indigo-700"
            >
              {statusActionLabel("confirmed")}
            </button>
          ) : null}
          {canBulkExport ? (
            <button
              type="button"
              onClick={() =>
                setConfirmState({
                  orderIds: selectedOrders.map((order) => order.id),
                  label: "데이터 추출",
                  mode: "export",
                })
              }
               className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold whitespace-nowrap text-gray-700 transition hover:bg-gray-50"
            >
              데이터 추출
            </button>
          ) : null}
          {canBulkMoveToShipped ? (
            <button
              type="button"
              onClick={() =>
                setConfirmState({
                  orderIds: selectedOrders.map((order) => order.id),
                  label: statusActionLabel("processing"),
                  mode: "status",
                  toStatus: "shipped",
                })
              }
               className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold whitespace-nowrap text-white transition hover:bg-emerald-700"
            >
              {statusActionLabel("processing")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs font-semibold text-indigo-500 transition hover:text-indigo-700"
          >
            선택 해제
          </button>
        </div>
      ) : null}

      {ordersQuery.isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center text-sm text-gray-400">주문 목록을 불러오는 중이에요.</div>
      ) : ordersQuery.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-14 text-center text-sm text-rose-500">주문 목록을 불러오지 못했어요.</div>
      ) : (
        <OrderTable
          orders={orders}
          selectedIds={selectedIds}
          onToggle={(id) =>
            setSelectedIds((current) => {
              const next = new Set(current);
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
              }
              return next;
            })
          }
          onToggleAll={toggleAll}
          onOpenDetail={setDetailOrder}
          onAction={(order, toStatus, label) =>
            setConfirmState({
              orderIds: [order.id],
              label,
              mode: "status",
              toStatus,
            })
          }
          onExport={(orderIds) =>
            setConfirmState({
              orderIds,
              label: "데이터 추출",
              mode: "export",
            })
          }
        />
      )}

      {(ordersQuery.data?.total_pages ?? 1) > 1 ? (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>총 {ordersQuery.data?.total ?? 0}건</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
            >
              이전
            </button>
            <span>
              {page} / {ordersQuery.data?.total_pages}
            </span>
            <button
              type="button"
              disabled={page >= (ordersQuery.data?.total_pages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      ) : null}

      {confirmState ? (
        <ConfirmModal
          title={confirmState.label}
          description={
            confirmState.mode === "export"
              ? `선택한 ${confirmState.orderIds.length}건의 주문 데이터를 하나의 ZIP 파일로 추출합니다.`
              : `선택한 ${confirmState.orderIds.length}건의 주문 상태를 "${confirmState.label}"으로 변경합니다.`
          }
          confirmLabel={confirmState.mode === "export" ? "추출 시작" : "변경하기"}
          confirmTone={confirmState.mode === "export" ? "emerald" : "indigo"}
          onCancel={() => setConfirmState(null)}
          onConfirm={async () => {
            const current = confirmState;
            setConfirmState(null);

            if (current.mode === "export") {
              exportMutation.mutate(current.orderIds);
              return;
            }

            if (current.toStatus) {
              bulkStatusMutation.mutate({ orderIds: current.orderIds, toStatus: current.toStatus });
            }
          }}
        />
      ) : null}

      {detailOrder ? <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} /> : null}
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>("confirmed");

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "confirmed", label: "주문 확인" },
    { key: "processing", label: "데이터 추출" },
    { key: "completed", label: "완료 주문" },
    { key: "all", label: "전체 주문" },
    { key: "stats", label: "통계" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Admin Dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">관리자 페이지</h1>
          </div>
          <Link href="/orders" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            My Books로 돌아가기
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === item.key ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "confirmed" ? (
          <AdminOrderPanel
            title="Order Confirmation"
            description="주문 확인 중인 주문을 검토하고 제작 단계로 넘길 수 있어요."
            statusFilters={["confirmed"]}
          />
        ) : null}

        {tab === "processing" ? (
          <AdminOrderPanel
            title="Data Export"
              description="제작에 필요한 자료를 내려받고, 작업이 끝난 주문은 완료 처리할 수 있어요."
              statusFilters={["processing"]}
            />
          ) : null}

        {tab === "completed" ? (
          <AdminOrderPanel
            title="Completed Orders"
            description="제작 완료와 수령 완료 상태의 주문을 확인할 수 있어요."
            statusFilters={["shipped", "received"]}
          />
        ) : null}

        {tab === "all" ? (
          <AdminOrderPanel
            title="All Active Orders"
            description="주문 전을 제외한 모든 주문 상태를 한 번에 확인할 수 있어요."
            statusFilters={["confirmed", "processing", "shipped", "received", "cancelled"]}
          />
        ) : null}

        {tab === "stats" ? <StatsSection /> : null}
      </main>
    </div>
  );
}
