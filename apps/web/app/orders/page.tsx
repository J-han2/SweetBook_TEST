"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StatePanel } from "@/components/ui/state-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { OrderStatus } from "@/lib/types";
import { coverThemeClasses, formatDate } from "@/lib/utils";

function primaryActionLabel(status: OrderStatus) {
  if (status === "pending") {
    return "주문하기";
  }
  if (status === "confirmed") {
    return "수정하기";
  }
  if (status === "shipped") {
    return "수령 확인";
  }
  return null;
}

function primaryActionClassName(status: OrderStatus) {
  if (status === "pending") {
    return "primary-button px-6 py-3.5";
  }
  if (status === "confirmed") {
    return "rounded-full border border-[rgba(122,97,146,0.18)] bg-[rgba(232,222,253,0.82)] px-6 py-3.5 text-sm font-semibold tracking-[0.02em] text-[var(--accent-strong)] transition hover:bg-[rgba(225,214,250,0.92)]";
  }
  if (status === "shipped") {
    return "rounded-full border border-[rgba(118,152,122,0.2)] bg-[rgba(226,239,220,0.94)] px-6 py-3.5 text-sm font-semibold tracking-[0.02em] text-[#49684f] transition hover:bg-[rgba(220,236,213,0.98)]";
  }
  return "";
}

function canCancel(status: OrderStatus) {
  return status === "pending" || status === "confirmed";
}

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: api.listOrders,
  });

  const refreshOrders = async () => {
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    await queryClient.invalidateQueries({ queryKey: ["order"] });
  };

  const receiveMutation = useMutation({
    mutationFn: (orderId: number) => api.receiveOrder(orderId),
    onSuccess: refreshOrders,
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId: number) => api.cancelOrder(orderId),
    onSuccess: refreshOrders,
  });

  const orders = ordersQuery.data?.items ?? [];

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/admin" className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[rgba(122,97,146,0.18)] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[var(--muted-strong)] transition hover:bg-white/90">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm0 2a1 1 0 100 2 1 1 0 000-2zm-1 4h2v3H7V9z"/>
            </svg>
            관리자 페이지로 이동
          </Link>
          <h1 className="page-title">Make your own book</h1>
          <p className="page-copy mt-5 max-w-3xl">
            좋아하는 장면을 모아 나만의 책을 만들어 보세요. 내가 주문한 책을 확인할 수 있어요.
          </p>
        </div>

        <Link href="/book-drafts" className="primary-button">
          새 책 만들기
        </Link>
      </section>

      {ordersQuery.isLoading ? (
        <StatePanel title="주문 목록을 불러오는 중" description="주문 상태와 책 정보를 준비하고 있어요." />
      ) : ordersQuery.isError ? (
        <StatePanel title="주문 목록을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요." />
      ) : orders.length === 0 ? (
        <StatePanel
          title="아직 주문한 책이 없어요"
          description="좋아하는 장면을 모아 첫 번째 책을 만들어 보세요."
          action={
            <Link href="/book-drafts" className="primary-button">
              첫 책 만들기
            </Link>
          }
        />
      ) : (
        <section className="space-y-5">
          {orders.map((order) => {
            const primaryAction = primaryActionLabel(order.status);
            const isReceivePending = receiveMutation.isPending && receiveMutation.variables === order.id;
            const isCancelPending = cancelMutation.isPending && cancelMutation.variables === order.id;

            return (
              <article
                key={order.id}
                role="link"
                tabIndex={0}
                className="glass-card interactive-card cursor-pointer overflow-hidden px-6 py-6 transition duration-300 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none md:px-7 md:py-7"
                onClick={() => router.push(`/orders/${order.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/orders/${order.id}`);
                  }
                }}
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:gap-8">
                  <div className="flex min-w-0 flex-1 items-center gap-5 md:gap-7">
                    <div className={`cover-preview h-34 w-24 shrink-0 bg-gradient-to-br ${coverThemeClasses(order.book_draft.cover_theme)} p-2.5 md:h-36 md:w-28`}>
                      <div className="flex h-full flex-col justify-end rounded-[18px] border border-white/65 bg-white/32 p-3">
                        <p className="font-display text-xs leading-tight text-[var(--accent-strong)] md:text-sm">
                          {order.book_draft.title}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-[1.8rem] leading-tight text-[var(--accent-strong)] md:text-[2.15rem]">
                        {order.book_draft.title}
                      </h2>

                      <p className="mt-4 text-[1rem] font-medium text-[var(--muted-strong)]">
                        {formatDate(order.created_at)} · {order.quantity}권
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row items-end justify-between gap-4 md:min-w-[290px] md:flex-col md:items-end md:justify-between">
                    <StatusBadge status={order.status} />

                    <div className="flex flex-wrap items-center justify-end gap-3">
                      {primaryAction ? (
                        <button
                          type="button"
                          className={primaryActionClassName(order.status)}
                          disabled={isReceivePending}
                          onClick={(event) => {
                            event.stopPropagation();

                            if (order.status === "pending") {
                              router.push(`/orders/${order.id}`);
                              return;
                            }
                            if (order.status === "confirmed") {
                              router.push(`/book-drafts/${order.book_draft.id}?orderId=${order.id}`);
                              return;
                            }
                            if (order.status === "shipped") {
                              receiveMutation.mutate(order.id);
                            }
                          }}
                        >
                          {isReceivePending ? "처리 중..." : primaryAction}
                        </button>
                      ) : null}

                      {canCancel(order.status) ? (
                        <button
                          type="button"
                          className="danger-button px-5 py-3.5"
                          disabled={isCancelPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            cancelMutation.mutate(order.id);
                          }}
                        >
                          {isCancelPending ? "취소 중..." : "주문 취소"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
