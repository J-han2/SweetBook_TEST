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
      <section>
        <p className="section-kicker">My Books</p>
        <h1 className="page-title mt-4">Your Book Collections</h1>
        <p className="page-copy mt-5 max-w-3xl">
          Finalize된 꿈일기 책은 주문으로 전환되고, 상태 관리와 export JSON 확인이 가능합니다. 실제 결제와 배송은 구현하지 않고 제출용 흐름에 집중했습니다.
        </p>
      </section>

      {ordersQuery.isLoading ? (
        <StatePanel title="주문 목록을 정리하는 중" description="책 표지, 상태, 생성일 정보를 차례대로 불러오고 있습니다." />
      ) : ordersQuery.isError ? (
        <StatePanel title="주문 목록을 불러오지 못했습니다" description="백엔드 실행 상태와 API 연결을 확인해 주세요." />
      ) : orders.length === 0 ? (
        <StatePanel
          title="아직 생성된 주문이 없습니다"
          description="책 초안을 Finalize한 뒤 주문을 만들면 여기에서 진행 상태를 볼 수 있습니다."
          action={
            <Link href="/book-drafts" className="primary-button">
              책 초안 보러 가기
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
                    <span>ID #{order.id}</span>
                    <span>수량 {order.quantity}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-4 md:items-end">
                <StatusBadge status={order.status} />
                <Link href={`/orders/${order.id}`} className="secondary-button">
                  View Details
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
