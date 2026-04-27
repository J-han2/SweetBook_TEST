"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { StatePanel } from "@/components/ui/state-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { OrderStatus } from "@/lib/types";
import { coverThemeClasses, formatDate, orderStatusLabel, resolveMediaUrl } from "@/lib/utils";

const orderStatuses: OrderStatus[] = ["pending", "processing", "completed", "cancelled"];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const orderId = Number(params.id);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("pending");
  const [localError, setLocalError] = useState<string | null>(null);

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: Number.isFinite(orderId),
  });

  useEffect(() => {
    if (orderQuery.data) {
      setSelectedStatus(orderQuery.data.status);
    }
  }, [orderQuery.data]);

  const statusMutation = useMutation({
    mutationFn: () => api.updateOrderStatus(orderId, selectedStatus),
    onSuccess: async (order) => {
      setSelectedStatus(order.status);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
    onError: (error: Error) => setLocalError(error.message),
  });

  if (orderQuery.isLoading) {
    return <StatePanel title="주문 상세를 불러오는 중" description="책 정보와 주문 상태를 준비하고 있어요." />;
  }

  if (orderQuery.isError || !orderQuery.data) {
    return <StatePanel title="주문을 찾을 수 없어요" description="삭제되었거나 잘못된 주소일 수 있어요." />;
  }

  const order = orderQuery.data;

  return (
    <div className="space-y-12">
      <section className="glass-card overflow-hidden">
        <div className={`cover-preview bg-gradient-to-br ${coverThemeClasses(order.book_draft.cover_theme)} p-8 md:p-10`}>
          <div className="grid gap-8 lg:grid-cols-[1fr_0.78fr]">
            <div className="rounded-[28px] border border-white/60 bg-white/36 p-8 backdrop-blur">
              <p className="section-kicker">Order Detail</p>
              <h1 className="mt-4 font-display text-5xl leading-tight text-[var(--accent-strong)]">{order.book_draft.title}</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted-strong)]">
                주문 상태를 확인하고, 필요할 때 내보내기 파일을 바로 받아보세요. 책에 어떤 꿈이 담겼는지도 함께 살펴볼 수 있어요.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                <span>{formatDate(order.created_at)}</span>
                <span>주문 #{order.id}</span>
                <span>{order.quantity}권</span>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/60 bg-white/40 p-8 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <p className="section-kicker">Order Status</p>
                <StatusBadge status={order.status} />
              </div>

              <div className="mt-6 space-y-4">
                <label className="field-label">상태 변경</label>
                <select className="field-input" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as OrderStatus)}>
                  {orderStatuses.map((status) => (
                    <option key={status} value={status}>
                      {orderStatusLabel(status)}
                    </option>
                  ))}
                </select>
                <button className="primary-button w-full" onClick={() => statusMutation.mutate()} disabled={statusMutation.isPending}>
                  상태 저장
                </button>
              </div>

              {localError ? <div className="mt-5 rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{localError}</div> : null}

              <div className="mt-6 flex flex-col gap-3">
                <a href={api.exportOrderUrl(order.id)} className="secondary-button w-full">
                  JSON 내보내기
                </a>
                <Link href={`/book-drafts/${order.book_draft.id}`} className="secondary-button w-full">
                  초안 보기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="section-kicker">Included Dreams</p>
          <h2 className="mt-3 font-display text-4xl text-[var(--accent-strong)]">Dreams in This Order</h2>
        </div>

        {order.book_draft.items.map((item, index) => (
          <article key={item.id} className="glass-card flex flex-col gap-5 p-6 md:flex-row md:items-center">
            <div className="text-sm text-[var(--muted)] md:w-[110px]">
              <p className="font-semibold tracking-[0.18em] text-[var(--accent-strong)]">순서 {String(index + 1).padStart(2, "0")}</p>
              <p className="mt-2 italic">{formatDate(item.dream_entry.dream_date)}</p>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-5">
              <img
                src={resolveMediaUrl(item.dream_entry.representative_image_url)}
                alt={item.dream_entry.title}
                className="h-28 w-24 rounded-[18px] object-cover"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-2xl text-[var(--accent-strong)]">{item.dream_entry.title}</h3>
                  <Link href={`/dreams/${item.dream_entry.id}`} className="text-sm font-semibold text-[var(--accent-strong)] hover:underline">
                    꿈 보기
                  </Link>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.dream_entry.content_preview}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
