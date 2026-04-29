"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { StatePanel } from "@/components/ui/state-panel";
import { TagPill } from "@/components/ui/tag-pill";
import { api } from "@/lib/api";
import { COVER_THEMES, coverThemeClasses, formatDate, resolveMediaUrl, themeLabel } from "@/lib/utils";

export default function BookDraftDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const draftId = Number(params.id);
  const requestedOrderId = Number(searchParams.get("orderId"));
  const hasRequestedOrder = Number.isFinite(requestedOrderId) && requestedOrderId > 0;

  const draftQuery = useQuery({
    queryKey: ["book-draft", draftId],
    queryFn: () => api.getBookDraft(draftId),
    enabled: Number.isFinite(draftId),
  });

  const orderQuery = useQuery({
    queryKey: ["order", requestedOrderId],
    queryFn: () => api.getOrder(requestedOrderId),
    enabled: hasRequestedOrder,
  });

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [coverPhrase, setCoverPhrase] = useState("");
  const [coverTheme, setCoverTheme] = useState("midnight-blue");
  const [quantity, setQuantity] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingAddressDetail, setShippingAddressDetail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const draggedIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!draftQuery.data) {
      return;
    }

    setTitle(draftQuery.data.title);
    setSubtitle(draftQuery.data.subtitle ?? "");
    setCoverPhrase(draftQuery.data.cover_phrase ?? "");
    setCoverTheme(draftQuery.data.cover_theme ?? "midnight-blue");
  }, [draftQuery.data]);

  useEffect(() => {
    if (!orderQuery.data || orderQuery.data.book_draft.id !== draftId) {
      return;
    }

    setQuantity(orderQuery.data.quantity);
    setRecipientName(orderQuery.data.recipient_name ?? "");
    setRecipientPhone(orderQuery.data.recipient_phone ?? "");
    setShippingAddress(orderQuery.data.shipping_address ?? "");
    setShippingAddressDetail(orderQuery.data.shipping_address_detail ?? "");
  }, [draftId, orderQuery.data]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["book-drafts"] });
    await queryClient.invalidateQueries({ queryKey: ["book-draft", draftId] });
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    if (hasRequestedOrder) {
      await queryClient.invalidateQueries({ queryKey: ["order", requestedOrderId] });
    }
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateBookDraft(draftId, {
        title,
        subtitle,
        cover_phrase: coverPhrase,
        cover_theme: coverTheme,
      }),
    onSuccess: refresh,
    onError: (error: Error) => setLocalError(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedItemIds: number[]) => api.reorderBookDraft(draftId, orderedItemIds),
    onSuccess: refresh,
    onError: (error: Error) => setLocalError(error.message),
  });

  const prepareOrderMutation = useMutation({
    mutationFn: async () => {
      if (draftQuery.data?.status === "draft") {
        await api.updateBookDraft(draftId, {
          title,
          subtitle,
          cover_phrase: coverPhrase,
          cover_theme: coverTheme,
        });
        await api.finalizeBookDraft(draftId);
      }
      return api.createOrder({ book_draft_id: draftId });
    },
    onSuccess: async (order) => {
      await refresh();
      router.push(`/orders/${order.id}`);
    },
    onError: (error: Error) => setLocalError(error.message),
  });

  const updateOrderMutation = useMutation({
    mutationFn: async () => {
      await api.updateBookDraft(draftId, {
        title,
        subtitle,
        cover_phrase: coverPhrase,
        cover_theme: coverTheme,
      });

      const orderPayload = orderForEdit?.status === "confirmed"
        ? {
            quantity,
            recipient_name: recipientName,
            recipient_phone: recipientPhone,
            shipping_address: shippingAddress,
            shipping_address_detail: shippingAddressDetail,
          }
        : {
            quantity,
          };

      return api.updateOrder(requestedOrderId, orderPayload);
    },
    onSuccess: async () => {
      await refresh();
      router.push(`/orders/${requestedOrderId}`);
    },
    onError: (error: Error) => setLocalError(error.message),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => api.removeBookDraftItem(draftId, itemId),
    onSuccess: refresh,
    onError: (error: Error) => setLocalError(error.message),
  });

  if (draftQuery.isLoading || (hasRequestedOrder && orderQuery.isLoading)) {
    return <StatePanel title="책 초안을 불러오는 중" description="표지와 꿈의 순서를 준비하고 있어요." />;
  }

  if (draftQuery.isError || !draftQuery.data || (hasRequestedOrder && orderQuery.isError)) {
    return <StatePanel title="책 초안을 찾을 수 없어요" description="이미 삭제되었거나 잘못된 주소일 수 있어요." />;
  }

  const draft = draftQuery.data;
  const orderForEdit = orderQuery.data && orderQuery.data.book_draft.id === draftId ? orderQuery.data : null;
  const isEditableOrderStatus = orderForEdit?.status === "pending" || orderForEdit?.status === "confirmed";
  const shouldShowShippingSection = orderForEdit?.status === "confirmed";
  const isEditingExistingOrder = Boolean(isEditableOrderStatus);
  const showCreateOrderFlow = draft.status === "finalized" && !hasRequestedOrder;
  const showOrderEditReturnOnly = draft.status === "finalized" && hasRequestedOrder && !isEditingExistingOrder;
  const canDragSort = draft.status === "draft" || isEditingExistingOrder;
  const canEditDraftFields = draft.status === "draft" || isEditingExistingOrder;
  const addDreamHref = isEditingExistingOrder
    ? `/book-drafts/${draftId}/add-dreams?orderId=${requestedOrderId}`
    : `/book-drafts/${draftId}/add-dreams`;

  function resetDragState() {
    draggedIdRef.current = null;
    setDraggingId(null);
    setHoverId(null);
  }

  function handleDragStart(itemId: number) {
    if (!canDragSort) {
      return;
    }
    draggedIdRef.current = itemId;
    setDraggingId(itemId);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, itemId: number) {
    if (!canDragSort) {
      return;
    }
    event.preventDefault();
    if (draggedIdRef.current !== itemId) {
      setHoverId(itemId);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>, dropItemId: number) {
    if (!canDragSort) {
      return;
    }
    event.preventDefault();

    const fromId = draggedIdRef.current;
    if (!fromId || fromId === dropItemId) {
      resetDragState();
      return;
    }

    const ids = draft.items.map((item) => item.id);
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(dropItemId);
    if (fromIndex === -1 || toIndex === -1) {
      resetDragState();
      return;
    }

    const next = [...ids];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, fromId);
    reorderMutation.mutate(next);
    resetDragState();
  }

  const draftCards = (
    <div className="space-y-4">
      {draft.items.map((item, index) => {
        const isDragging = draggingId === item.id;
        const isHovered = hoverId === item.id && !isDragging;

        return (
          <article
            key={item.id}
            draggable={canDragSort}
            onDragStart={() => handleDragStart(item.id)}
            onDragOver={(event) => handleDragOver(event, item.id)}
            onDrop={(event) => handleDrop(event, item.id)}
            onDragEnd={resetDragState}
            className={[
              "glass-card flex flex-col gap-5 p-6 md:flex-row md:items-center",
              "transition-[transform,opacity,border-color,background-color] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]",
              canDragSort ? "cursor-grab active:cursor-grabbing" : "",
              isDragging ? "scale-[0.985] opacity-45" : "",
              isHovered ? "border-[rgba(122,97,146,0.28)] bg-[rgba(241,235,255,0.76)]" : "",
            ].join(" ")}
          >
            {canDragSort ? (
              <div className="hidden shrink-0 text-[var(--muted)] md:flex md:flex-col md:items-center md:gap-1">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M7 4a1 1 0 100 2 1 1 0 000-2zM7 9a1 1 0 100 2 1 1 0 000-2zM7 14a1 1 0 100 2 1 1 0 000-2zM13 4a1 1 0 100 2 1 1 0 000-2zM13 9a1 1 0 100 2 1 1 0 000-2zM13 14a1 1 0 100 2 1 1 0 000-2z" />
                </svg>
              </div>
            ) : null}

            <div className="text-sm text-[var(--muted)] md:w-[110px]">
              <p className="font-semibold tracking-[0.18em] text-[var(--accent-strong)]">장면 {String(index + 1).padStart(2, "0")}</p>
              <p className="mt-2 italic">{formatDate(item.dream_entry.dream_date)}</p>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-5">
              <img
                src={resolveMediaUrl(item.dream_entry.representative_image_url)}
                alt={item.dream_entry.title}
                className="h-28 w-24 rounded-[18px] object-cover"
              />

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-2xl text-[var(--accent-strong)]">{item.dream_entry.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.dream_entry.content_preview}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.dream_entry.tags.slice(0, 4).map((tag) => (
                    <TagPill key={`${item.id}-${tag.id}`} tag={tag} />
                  ))}
                </div>
              </div>
            </div>

            {isEditingExistingOrder ? (
              <button
                type="button"
                className="danger-button shrink-0 px-4 py-2"
                disabled={removeItemMutation.isPending || draft.items.length <= 1}
                onClick={() => removeItemMutation.mutate(item.id)}
              >
                삭제
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-12">
      <section className="glass-card overflow-hidden">
        <div className={`cover-preview bg-gradient-to-br ${coverThemeClasses(coverTheme)} p-8 md:p-10`}>
          <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr]">
            <div className="rounded-[28px] border border-white/60 bg-white/36 p-8 backdrop-blur">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/70 px-4 py-2 text-sm text-[var(--muted-strong)]">{draft.items.length}개의 꿈</span>
              </div>
              <p className="section-kicker mt-6">{formatDate(draft.updated_at)}</p>
              <h1 className="mt-4 font-display text-5xl leading-tight text-[var(--accent-strong)]">{draft.title}</h1>
              <p className="mt-4 text-base italic text-[var(--muted-strong)]">{draft.subtitle || "부제가 아직 없어요."}</p>
            </div>

            <div className="rounded-[28px] border border-white/60 bg-white/40 p-8 backdrop-blur">
              <div className="space-y-5">
                <div>
                  <label className="field-label">책 제목</label>
                  <input className="field-input" value={title} onChange={(event) => setTitle(event.target.value)} disabled={!canEditDraftFields} />
                </div>
                <div>
                  <label className="field-label">부제</label>
                  <input className="field-input" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} disabled={!canEditDraftFields} />
                </div>
                <div>
                  <label className="field-label">표지 문구</label>
                  <textarea
                    className="field-input min-h-[100px] resize-none"
                    value={coverPhrase}
                    onChange={(event) => setCoverPhrase(event.target.value)}
                    disabled={!canEditDraftFields}
                  />
                </div>
                <div>
                  <label className="field-label">표지 테마</label>
                  <div className="field-select-wrap">
                    <select
                      className="field-input field-select"
                      value={coverTheme}
                      onChange={(event) => setCoverTheme(event.target.value)}
                      disabled={!canEditDraftFields}
                    >
                      {COVER_THEMES.map((theme) => (
                        <option key={theme.value} value={theme.value}>
                          {theme.label}
                        </option>
                      ))}
                    </select>
                    <span className="field-select-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20">
                        <path d="M5.5 7.75 10 12.25l4.5-4.5" />
                      </svg>
                    </span>
                  </div>
                  <p className="mt-2 text-sm italic text-[var(--muted)]">현재 테마: {themeLabel(draft.cover_theme)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isEditingExistingOrder ? (
        <section className="space-y-5">
          <div className="rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.56)_100%)] px-6 py-6 backdrop-blur-xl md:px-7">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="section-kicker">Edit Order</p>
                  <h2 className="mt-3 font-display text-4xl text-[var(--accent-strong)]">Reading Order</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    꿈 카드를 드래그해 순서를 바꾸고, 필요한 장면을 추가하거나 삭제해보세요.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link href={addDreamHref} className="secondary-button">
                    꿈 추가하기
                  </Link>
                  <button className="primary-button" onClick={() => updateOrderMutation.mutate()} disabled={updateOrderMutation.isPending}>
                    {updateOrderMutation.isPending ? "저장 중..." : "수정 내용 저장하기"}
                  </button>
                  <Link href={`/orders/${requestedOrderId}`} className="secondary-button">
                    저장하지 않고 종료
                  </Link>
                </div>
              </div>

              <div className="max-w-[220px]">
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

              {localError ? <div className="rounded-[24px] bg-[rgba(245,215,223,0.84)] px-6 py-4 text-sm text-[#8f4854]">{localError}</div> : null}
            </div>
          </div>

          {shouldShowShippingSection ? (
            <section className="glass-card p-6 md:p-7">
              <div className="max-w-3xl">
                <p className="section-kicker">Delivery Info</p>
                <h2 className="mt-3 font-display text-3xl text-[var(--accent-strong)]">배송 정보 수정</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  주문 확인 중에는 수령인 정보와 배송지를 함께 수정할 수 있어요.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">수령인 이름</label>
                  <input className="field-input" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} />
                </div>
                <div>
                  <label className="field-label">전화번호</label>
                  <input className="field-input" value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">배송지</label>
                  <input className="field-input" value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">상세 주소</label>
                  <input
                    className="field-input"
                    value={shippingAddressDetail}
                    onChange={(event) => setShippingAddressDetail(event.target.value)}
                    placeholder="상세 주소가 있다면 적어주세요"
                  />
                </div>
              </div>
            </section>
          ) : null}

          {draftCards}
        </section>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[0.86fr_1.14fr]">
          <section className="glass-card p-8">
            <p className="section-kicker">{draft.status === "draft" ? "Draft Actions" : "Order Actions"}</p>
            <h2 className="mt-3 font-display text-3xl text-[var(--accent-strong)]">
              {draft.status === "draft" ? "Keep Shaping the Book" : "Ready to Order"}
            </h2>

            {localError ? <div className="mt-6 rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{localError}</div> : null}

            <div className="mt-8 flex flex-col gap-3">
              {draft.status === "draft" ? (
                <>
                  <button className="primary-button w-full" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "저장 중..." : "초안 저장하기"}
                  </button>
                  <button className="secondary-button w-full" onClick={() => prepareOrderMutation.mutate()} disabled={prepareOrderMutation.isPending}>
                    {prepareOrderMutation.isPending ? "준비 중..." : "주문 준비하기"}
                  </button>
                </>
              ) : showOrderEditReturnOnly ? (
                <Link href={`/orders/${requestedOrderId}`} className="secondary-button w-full">
                  이전 화면으로
                </Link>
              ) : showCreateOrderFlow ? (
                <button className="primary-button w-full" onClick={() => prepareOrderMutation.mutate()} disabled={prepareOrderMutation.isPending}>
                  {prepareOrderMutation.isPending ? "준비 중..." : "주문 페이지로 이동"}
                </button>
              ) : (
                <Link href="/orders" className="secondary-button w-full">
                  내 책장 보기
                </Link>
              )}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-end justify-between gap-6 px-1">
              <div>
                <p className="section-kicker">Selected Dreams</p>
                <h2 className="mt-3 font-display text-4xl text-[var(--accent-strong)]">Reading Order</h2>
              </div>
              {draft.status === "draft" ? (
                <p className="text-sm text-[var(--muted)]">카드를 끌어 순서를 바꿔보세요.</p>
              ) : null}
            </div>

            {draftCards}
          </section>
        </div>
      )}
    </div>
  );
}
