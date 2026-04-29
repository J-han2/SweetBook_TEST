"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { StatePanel } from "@/components/ui/state-panel";
import { TagPill } from "@/components/ui/tag-pill";
import { api } from "@/lib/api";
import { DreamEntrySummary } from "@/lib/types";
import { COVER_THEMES, coverThemeClasses, formatDate, resolveMediaUrl } from "@/lib/utils";

export function NewBookDraftClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ids = useMemo(
    () =>
      (searchParams.get("ids") ?? "")
        .split(",")
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    [searchParams],
  );

  const [title, setTitle] = useState("밤의 장면을 모은 책");
  const [subtitle, setSubtitle] = useState("꿈속에서만 만난 장면들의 기록");
  const [coverPhrase, setCoverPhrase] = useState("사라지기 전에 붙잡아 둔 꿈의 조각들");
  const [coverTheme, setCoverTheme] = useState("midnight-blue");
  const [localError, setLocalError] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<number[]>(ids);

  const dreamsQuery = useQuery({
    queryKey: ["dreams", "for-draft", ids.join(",")],
    queryFn: () => api.listDreamEntries({ sort: "dream_date_desc" }),
    enabled: ids.length > 0,
  });

  useEffect(() => {
    setOrderedIds(ids);
  }, [ids]);

  const selectedDreams = useMemo(() => {
    const items = dreamsQuery.data?.items ?? [];
    const map = new Map(items.map((item) => [item.id, item]));
    return ids
      .map((id) => map.get(id))
      .filter((item): item is DreamEntrySummary => Boolean(item));
  }, [dreamsQuery.data?.items, ids]);

  const orderedDreams = useMemo(() => {
    const map = new Map(selectedDreams.map((item) => [item.id, item]));
    return orderedIds
      .map((id) => map.get(id))
      .filter((item): item is DreamEntrySummary => Boolean(item));
  }, [orderedIds, selectedDreams]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.createBookDraft({
        title,
        subtitle,
        cover_phrase: coverPhrase,
        cover_theme: coverTheme,
        dream_entry_ids: orderedIds,
      }),
    onSuccess: (draft) => router.push(`/book-drafts/${draft.id}`),
    onError: (error: Error) => setLocalError(error.message),
  });

  if (!ids.length) {
    return (
      <StatePanel
        title="선택된 꿈일기가 없어요"
        description="책 만들기 페이지에서 꿈을 먼저 고른 뒤 다시 와주세요."
        action={
          <Link href="/book-drafts" className="primary-button">
            책 만들기로 이동
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="section-kicker">Book Draft</p>
        <h1 className="page-title mt-4">Curate Your Collection</h1>
        <p className="page-copy mx-auto mt-5 max-w-2xl italic">
          선택한 꿈일기들을 한 권으로 엮어보세요. 제목과 표지 문구를 정하고, 읽기 좋은 순서로 차분히 다듬을 수 있어요.
        </p>
      </section>

      <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="space-y-8">
          <section className="glass-card p-8">
            <h2 className="font-display text-3xl text-[var(--accent-strong)]">책 정보</h2>
            <div className="mt-8 space-y-6">
              <div>
                <label className="field-label">책 제목</label>
                <input className="field-input font-display text-xl" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div>
                <label className="field-label">부제</label>
                <input className="field-input italic" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
              </div>
              <div>
                <label className="field-label">표지 문구</label>
                <textarea
                  className="field-input min-h-[120px] resize-none italic"
                  value={coverPhrase}
                  onChange={(event) => setCoverPhrase(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="glass-card p-8">
            <h2 className="font-display text-3xl text-[var(--accent-strong)]">표지 테마</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {COVER_THEMES.map((theme) => {
                const active = coverTheme === theme.value;
                return (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => setCoverTheme(theme.value)}
                    className="space-y-3 text-left"
                  >
                    <div
                      className={`cover-preview aspect-[3/4] rounded-[20px] bg-gradient-to-br ${coverThemeClasses(theme.value)} ${
                        active ? "ring-2 ring-[rgba(108,95,142,0.35)] ring-offset-4 ring-offset-[rgba(250,248,245,0.95)]" : ""
                      }`}
                    />
                    <p className={`text-sm font-semibold ${active ? "text-[var(--accent-strong)]" : "text-[var(--muted)]"}`}>{theme.label}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="glass-card p-8">
            <div className={`cover-preview aspect-[4/5] bg-gradient-to-br ${coverThemeClasses(coverTheme)} p-8`}>
              <div className="flex h-full flex-col justify-between rounded-[22px] border border-white/50 bg-white/25 p-6 backdrop-blur">
                <div>
                  <p className="section-kicker">미리보기</p>
                  <h3 className="mt-4 font-display text-4xl leading-tight text-[var(--accent-strong)]">{title}</h3>
                  <p className="mt-3 italic text-[var(--muted-strong)]">{subtitle}</p>
                </div>
                <p className="text-sm italic leading-7 text-[var(--muted-strong)]">{coverPhrase}</p>
              </div>
            </div>

            {localError ? <div className="mt-6 rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{localError}</div> : null}

            <div className="mt-6 flex flex-col gap-3">
              <button className="primary-button w-full py-4" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? "초안을 만드는 중..." : "책 초안 만들기"}
              </button>
              <Link href="/book-drafts" className="secondary-button w-full py-4">
                꿈 다시 고르기
              </Link>
            </div>
          </section>
        </aside>

        <section>
          <div className="mb-8 flex items-center justify-between gap-4 px-2">
            <div>
              <p className="section-kicker">선택한 꿈</p>
              <h2 className="mt-3 font-display text-4xl text-[var(--accent-strong)]">책에 담길 순서</h2>
            </div>
            <span className="rounded-full bg-white/70 px-4 py-2 text-sm text-[var(--muted-strong)]">{orderedDreams.length}개</span>
          </div>

          {dreamsQuery.isLoading ? (
            <StatePanel title="선택한 꿈을 정리하는 중" description="순서를 편집할 수 있도록 꿈일기 목록을 준비하고 있어요." />
          ) : (
            <div className="space-y-5">
              {orderedDreams.map((dream, index) => (
                <article
                  key={dream.id}
                  className={`glass-card flex flex-col gap-5 p-6 transition duration-500 hover:-translate-y-1 md:flex-row md:items-center ${
                    index % 2 === 0 ? "md:-rotate-[0.35deg]" : "md:rotate-[0.35deg]"
                  }`}
                >
                  <div className="text-sm text-[var(--muted)] md:w-[110px]">
                    <p className="font-semibold tracking-[0.18em] text-[var(--accent-strong)]">장면 {String(index + 1).padStart(2, "0")}</p>
                    <p className="mt-2 italic">{formatDate(dream.dream_date)}</p>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-5">
                    <img
                      src={resolveMediaUrl(dream.image_url)}
                      alt={dream.title}
                      className="h-28 w-24 rounded-[18px] object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-2xl text-[var(--accent-strong)]">{dream.title}</h3>
                      <p className="mt-2 text-sm italic leading-7 text-[var(--muted)]">{dream.content_preview}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {dream.tags.slice(0, 3).map((tag) => (
                          <TagPill key={`${dream.id}-${tag.id}`} tag={tag} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 md:flex-col">
                    <button
                      type="button"
                      className="secondary-button px-4 py-2"
                      disabled={index === 0}
                      onClick={() =>
                        setOrderedIds((current) => {
                          const next = [...current];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          return next;
                        })
                      }
                    >
                      위로
                    </button>
                    <button
                      type="button"
                      className="secondary-button px-4 py-2"
                      disabled={index === orderedDreams.length - 1}
                      onClick={() =>
                        setOrderedIds((current) => {
                          const next = [...current];
                          [next[index], next[index + 1]] = [next[index + 1], next[index]];
                          return next;
                        })
                      }
                    >
                      아래로
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
