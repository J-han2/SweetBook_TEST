"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { StatePanel } from "@/components/ui/state-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagPill } from "@/components/ui/tag-pill";
import { api } from "@/lib/api";
import { coverThemeClasses, formatDate, resolveMediaUrl, themeLabel } from "@/lib/utils";

const coverThemes = [
  { value: "midnight-blue", label: "한밤의 푸른빛" },
  { value: "starlit-plum", label: "별빛 자두빛" },
  { value: "cream-dusk", label: "크림 노을" },
  { value: "emerald-night", label: "에메랄드 밤" },
];

export default function BookDraftDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const draftId = Number(params.id);

  const draftQuery = useQuery({
    queryKey: ["book-draft", draftId],
    queryFn: () => api.getBookDraft(draftId),
    enabled: Number.isFinite(draftId),
  });

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [coverPhrase, setCoverPhrase] = useState("");
  const [coverTheme, setCoverTheme] = useState("midnight-blue");
  const [quantity, setQuantity] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftQuery.data) {
      return;
    }
    setTitle(draftQuery.data.title);
    setSubtitle(draftQuery.data.subtitle ?? "");
    setCoverPhrase(draftQuery.data.cover_phrase ?? "");
    setCoverTheme(draftQuery.data.cover_theme ?? "midnight-blue");
  }, [draftQuery.data]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["book-drafts"] });
    await queryClient.invalidateQueries({ queryKey: ["book-draft", draftId] });
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

  const finalizeMutation = useMutation({
    mutationFn: () => api.finalizeBookDraft(draftId),
    onSuccess: refresh,
    onError: (error: Error) => setLocalError(error.message),
  });

  const createOrderMutation = useMutation({
    mutationFn: () => api.createOrder({ book_draft_id: draftId, quantity }),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push(`/orders/${order.id}`);
    },
    onError: (error: Error) => setLocalError(error.message),
  });

  if (draftQuery.isLoading) {
    return <StatePanel title="책 초안을 불러오는 중" description="표지와 순서 정보를 준비하고 있어요." />;
  }

  if (draftQuery.isError || !draftQuery.data) {
    return <StatePanel title="책 초안을 찾을 수 없어요" description="삭제되었거나 잘못된 주소일 수 있어요." />;
  }

  const draft = draftQuery.data;
  const itemIds = draft.items.map((item) => item.id);

  return (
    <div className="space-y-12">
      <section className="glass-card overflow-hidden">
        <div className={`cover-preview bg-gradient-to-br ${coverThemeClasses(coverTheme)} p-8 md:p-10`}>
          <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr]">
            <div className="rounded-[28px] border border-white/60 bg-white/36 p-8 backdrop-blur">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={draft.status} />
                <span className="rounded-full bg-white/70 px-4 py-2 text-sm text-[var(--muted-strong)]">{draft.items.length}개의 꿈</span>
              </div>
              <p className="section-kicker mt-6">{formatDate(draft.updated_at)}</p>
              <h1 className="mt-4 font-display text-5xl leading-tight text-[var(--accent-strong)]">{draft.title}</h1>
              <p className="mt-4 text-base italic text-[var(--muted-strong)]">{draft.subtitle || "부제가 아직 없어요."}</p>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--muted-strong)]">
                이곳에서 책 제목과 표지, 순서를 편하게 다듬어보세요. 준비가 끝나면 초안을 확정하고 주문으로 이어갈 수 있어요.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/60 bg-white/40 p-8 backdrop-blur">
              <div className="space-y-5">
                <div>
                  <label className="field-label">책 제목</label>
                  <input className="field-input" value={title} onChange={(event) => setTitle(event.target.value)} disabled={draft.status === "finalized"} />
                </div>
                <div>
                  <label className="field-label">부제</label>
                  <input className="field-input" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} disabled={draft.status === "finalized"} />
                </div>
                <div>
                  <label className="field-label">표지 문구</label>
                  <textarea
                    className="field-input min-h-[120px] resize-none"
                    value={coverPhrase}
                    onChange={(event) => setCoverPhrase(event.target.value)}
                    disabled={draft.status === "finalized"}
                  />
                </div>
                <div>
                  <label className="field-label">표지 테마</label>
                  <select className="field-input" value={coverTheme} onChange={(event) => setCoverTheme(event.target.value)} disabled={draft.status === "finalized"}>
                    {coverThemes.map((theme) => (
                      <option key={theme.value} value={theme.value}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm italic text-[var(--muted)]">현재 테마: {themeLabel(draft.cover_theme)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.86fr_1.14fr]">
        <section className="glass-card p-8">
          <p className="section-kicker">Draft Actions</p>
          <h2 className="mt-3 font-display text-3xl text-[var(--accent-strong)]">Keep Shaping the Book</h2>

          {localError ? <div className="mt-6 rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{localError}</div> : null}

          <div className="mt-8 flex flex-col gap-3">
            {draft.status === "draft" ? (
              <>
                <button className="primary-button w-full" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  정보 저장
                </button>
                <button className="secondary-button w-full" onClick={() => reorderMutation.mutate(itemIds)} disabled={reorderMutation.isPending}>
                  현재 순서 저장
                </button>
                <button className="secondary-button w-full" onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
                  초안 확정하기
                </button>
              </>
            ) : (
              <>
                <label className="field-label">주문 수량</label>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  max={99}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
                <button className="primary-button w-full" onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending}>
                  주문 만들기
                </button>
                <Link href="/orders" className="secondary-button w-full">
                  내 책장 보기
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-6 px-1">
            <div>
              <p className="section-kicker">Selected Dreams</p>
              <h2 className="mt-3 font-display text-4xl text-[var(--accent-strong)]">Reading Order</h2>
            </div>
          </div>

          {draft.items.map((item, index) => (
            <article key={item.id} className="glass-card flex flex-col gap-5 p-6 md:flex-row md:items-center">
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
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-2xl text-[var(--accent-strong)]">{item.dream_entry.title}</h3>
                    <Link href={`/dreams/${item.dream_entry.id}`} className="text-sm font-semibold text-[var(--accent-strong)] hover:underline">
                      꿈 보기
                    </Link>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.dream_entry.content_preview}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.dream_entry.tags.slice(0, 4).map((tag) => (
                      <TagPill key={`${item.id}-${tag.id}`} tag={tag} />
                    ))}
                  </div>
                </div>
              </div>

              {draft.status === "draft" ? (
                <div className="flex gap-2 md:flex-col">
                  <button
                    type="button"
                    className="secondary-button px-4 py-2"
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...itemIds];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      reorderMutation.mutate(next);
                    }}
                  >
                    위로
                  </button>
                  <button
                    type="button"
                    className="secondary-button px-4 py-2"
                    disabled={index === draft.items.length - 1}
                    onClick={() => {
                      const next = [...itemIds];
                      [next[index], next[index + 1]] = [next[index + 1], next[index]];
                      reorderMutation.mutate(next);
                    }}
                  >
                    아래로
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
