"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StatePanel } from "@/components/ui/state-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { OrderStatus } from "@/lib/types";
import { coverThemeClasses, formatDate, resolveMediaUrl } from "@/lib/utils";

function canCancel(status: OrderStatus) {
  return status === "pending" || status === "confirmed";
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

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const orderId = Number(params.id);

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: Number.isFinite(orderId),
  });

  const [quantity, setQuantity] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingAddressDetail, setShippingAddressDetail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderQuery.data) {
      return;
    }

    setQuantity(orderQuery.data.quantity);
    setRecipientName(orderQuery.data.recipient_name ?? "");
    setRecipientPhone(orderQuery.data.recipient_phone ?? "");
    setShippingAddress(orderQuery.data.shipping_address ?? "");
    setShippingAddressDetail(orderQuery.data.shipping_address_detail ?? "");
    setValidationError(null);
  }, [orderQuery.data]);

  const refreshOrder = async () => {
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
  };

  const confirmMutation = useMutation({
    mutationFn: () =>
      api.confirmOrder(orderId, {
        quantity,
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        shipping_address: shippingAddress.trim(),
        shipping_address_detail: shippingAddressDetail.trim() || undefined,
      }),
    onSuccess: async () => {
      setValidationError(null);
      await refreshOrder();
    },
  });

  const receiveMutation = useMutation({
    mutationFn: () => api.receiveOrder(orderId),
    onSuccess: refreshOrder,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelOrder(orderId),
    onSuccess: refreshOrder,
  });

  if (orderQuery.isLoading) {
    return <StatePanel title="주문 정보를 불러오는 중이에요" description="책 정보와 주문 상태를 준비하고 있어요." />;
  }

  if (orderQuery.isError || !orderQuery.data) {
    return <StatePanel title="주문을 찾을 수 없어요" description="이미 삭제되었거나 잘못된 주소로 접근한 것 같아요." />;
  }

  const order = orderQuery.data;
  const isPendingOrder = order.status === "pending";

  const orderSummary = useMemo(
    () => [
      { label: "주문일", value: formatDate(order.created_at) },
      { label: "수량", value: `${order.quantity}권` },
      { label: "담긴 꿈", value: `${order.book_draft.items.length}개` },
      { label: "마지막 변경", value: formatDate(order.updated_at) },
    ],
    [order],
  );

  const mutationError =
    (confirmMutation.error as Error | null)?.message ??
    (receiveMutation.error as Error | null)?.message ??
    (cancelMutation.error as Error | null)?.message ??
    null;

  const actionError = validationError ?? mutationError;

  const handleConfirmOrder = () => {
    const trimmedName = recipientName.trim();
    const trimmedPhone = recipientPhone.trim();
    const trimmedAddress = shippingAddress.trim();

    if (!Number.isFinite(quantity) || quantity < 1) {
      setValidationError("수량은 1권 이상으로 입력해주세요.");
      return;
    }

    if (!trimmedName) {
      setValidationError("수령인 이름을 입력해주세요.");
      return;
    }

    if (!trimmedPhone) {
      setValidationError("전화번호를 입력해주세요.");
      return;
    }

    if (!trimmedAddress) {
      setValidationError("배송지를 입력해주세요.");
      return;
    }

    setValidationError(null);
    confirmMutation.mutate();
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-start">
        <Link href="/orders" className="secondary-button px-6 py-3">
          이전 화면으로
        </Link>
      </div>

      <section className="glass-card relative overflow-hidden px-6 py-7 md:px-7 md:py-8">
        <div className="absolute right-6 top-6 md:right-7 md:top-7">
          <StatusBadge status={order.status} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-stretch">
          <div className={`cover-preview h-56 w-40 bg-gradient-to-br ${coverThemeClasses(order.book_draft.cover_theme)} p-3 md:h-64 md:w-48`}>
            <div className="flex h-full flex-col justify-end rounded-[22px] border border-white/65 bg-white/34 p-5">
              <p className="font-display text-xl leading-tight text-[var(--accent-strong)]">{order.book_draft.title}</p>
            </div>
          </div>

          <div className="min-w-0 pt-8 lg:pt-4">
            <p className="text-sm tracking-[0.16em] text-[var(--muted)]">주문한 책</p>
            <h1 className="mt-4 font-display text-[2.25rem] leading-tight text-[var(--accent-strong)] md:text-[2.8rem]">
              {order.book_draft.title}
            </h1>

            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              {orderSummary.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)]">{item.label}</dt>
                  <dd className="mt-2 text-[1.02rem] text-[var(--muted-strong)]">{item.value}</dd>
                </div>
              ))}
            </dl>

            {isPendingOrder ? (
              <div className="mt-8 rounded-[28px] border border-[rgba(122,97,146,0.12)] bg-[rgba(255,255,255,0.64)] p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="field-label">수량</label>
                    <input
                      className="field-input"
                      type="number"
                      min={1}
                      max={99}
                      value={quantity}
                      onChange={(event) => setQuantity(Number(event.target.value))}
                    />
                  </div>
                  <div>
                    <label className="field-label">수령인 이름</label>
                    <input className="field-input" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">전화번호</label>
                    <input className="field-input" value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">배송지</label>
                    <input className="field-input" value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="field-label">상세 주소</label>
                    <input
                      className="field-input"
                      value={shippingAddressDetail}
                      onChange={(event) => setShippingAddressDetail(event.target.value)}
                      placeholder="상세 주소가 있다면 함께 적어주세요"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 rounded-[28px] border border-[rgba(122,97,146,0.12)] bg-[rgba(255,255,255,0.64)] p-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)]">수령인 이름</dt>
                  <dd className="mt-2 text-[1.02rem] text-[var(--muted-strong)]">{order.recipient_name ?? "입력 전"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)]">전화번호</dt>
                  <dd className="mt-2 text-[1.02rem] text-[var(--muted-strong)]">{order.recipient_phone ?? "입력 전"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)]">배송지</dt>
                  <dd className="mt-2 text-[1.02rem] text-[var(--muted-strong)]">{order.shipping_address ?? "입력 전"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)]">상세 주소</dt>
                  <dd className="mt-2 text-[1.02rem] text-[var(--muted-strong)]">{order.shipping_address_detail ?? "-"}</dd>
                </div>
              </div>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-3">
              {order.status === "pending" ? (
                <button
                  className={primaryActionClassName(order.status)}
                  onClick={handleConfirmOrder}
                  disabled={confirmMutation.isPending}
                >
                  {confirmMutation.isPending ? "주문 중..." : "주문하기"}
                </button>
              ) : order.status === "confirmed" ? (
                <Link href={`/book-drafts/${order.book_draft.id}?orderId=${order.id}`} className={primaryActionClassName(order.status)}>
                  수정하기
                </Link>
              ) : order.status === "shipped" ? (
                <button
                  className={primaryActionClassName(order.status)}
                  onClick={() => receiveMutation.mutate()}
                  disabled={receiveMutation.isPending}
                >
                  {receiveMutation.isPending ? "처리 중..." : "수령 확인"}
                </button>
              ) : null}

              {canCancel(order.status) ? (
                <button className="danger-button px-6 py-3.5" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                  {cancelMutation.isPending ? "취소 중..." : "주문 취소"}
                </button>
              ) : null}
            </div>

            {actionError ? (
              <div className="mt-5 rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{actionError}</div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="font-display text-[2.05rem] text-[var(--accent-strong)] md:text-[2.35rem]">Dreams in this book</h2>
          <p className="mt-3 text-[0.98rem] text-[var(--muted)]">책에 담긴 꿈의 순서와 장면을 확인해보세요.</p>
        </div>

        <div className="space-y-4">
          {order.book_draft.items.map((item, index) => (
            <article key={item.id} className="glass-card flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-6 md:p-6">
              <div className="flex items-center gap-3 text-sm text-[var(--muted)] md:w-[132px] md:flex-col md:items-start md:justify-center">
                <span className="rounded-full bg-[rgba(232,222,253,0.72)] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[var(--accent-strong)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{formatDate(item.dream_entry.dream_date)}</span>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-5">
                <img
                  src={resolveMediaUrl(item.dream_entry.representative_image_url)}
                  alt={item.dream_entry.title}
                  className="h-28 w-24 shrink-0 rounded-[18px] object-cover"
                />

                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[1.6rem] leading-tight text-[var(--accent-strong)]">{item.dream_entry.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.dream_entry.content_preview}</p>
                </div>
              </div>

              <div className="md:self-center">
                <Link href={`/dreams/${item.dream_entry.id}?returnToOrder=${order.id}`} className="secondary-button px-5 py-3">
                  꿈 보기
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
