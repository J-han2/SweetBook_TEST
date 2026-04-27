"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { StatePanel } from "@/components/ui/state-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { coverThemeClasses, formatDate } from "@/lib/utils";

export default function OrdersPage() {
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: api.listOrders,
  });

  const orders = ordersQuery.data?.items ?? [];

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">My Books</p>
          <h1 className="page-title mt-4">Track Your Book Orders</h1>
          <p className="page-copy mt-5 max-w-3xl">
            만들어 둔 책과 주문 상태를 한눈에 확인해보세요. 작업 중인지, 완료되었는지, 내보내기 파일은 준비되었는지 이곳에서
            바로 볼 수 있어요.
          </p>
        </div>

        <Link href="/book-drafts" className="primary-button">
          새 책 만들기
        </Link>
      </section>

      {ordersQuery.isLoading ? (
        <StatePanel title="주문 목록을 불러오는 중" description="책 제목과 주문 상태를 정리하고 있어요." />
      ) : ordersQuery.isError ? (
        <StatePanel title="주문 목록을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요." />
      ) : orders.length === 0 ? (
        <StatePanel
          title="아직 주문한 책이 없어요"
          description="마음에 드는 꿈들을 골라 책으로 엮으면, 여기서 진행 상태를 확인할 수 있어요."
          action={
            <Link href="/book-drafts" className="primary-button">
              첫 책 만들기
            </Link>
          }
        />
      ) : (
        <section className="space-y-6">
          {orders.map((order) => (
            <article key={order.id} className="glass-card flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-6">
                <div className={`cover-preview h-32 w-24 bg-gradient-to-br ${coverThemeClasses(order.book_draft.cover_theme)} p-2`}>
                  <div className="flex h-full flex-col justify-end rounded-[16px] border border-white/60 bg-white/30 p-3">
                    <p className="font-display text-sm leading-tight text-[var(--accent-strong)]">{order.book_draft.title}</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <h2 className="font-display text-3xl text-[var(--accent-strong)]">{order.book_draft.title}</h2>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                    <span>{formatDate(order.created_at)}</span>
                    <span>주문 #{order.id}</span>
                    <span>{order.quantity}권</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-4 md:items-end">
                <StatusBadge status={order.status} />
                <Link href={`/orders/${order.id}`} className="secondary-button">
                  상세 보기
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
