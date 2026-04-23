"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { StatePanel } from "@/components/ui/state-panel";
import { TagPill } from "@/components/ui/tag-pill";
import { api } from "@/lib/api";
import { DreamEntrySummary } from "@/lib/types";
import { coverThemeClasses, formatDate, resolveMediaUrl } from "@/lib/utils";

const coverThemes = [
  { value: "midnight-blue", label: "Cloudscape" },
  { value: "starlit-plum", label: "Velvet Night" },
  { value: "cream-dusk", label: "Dawn Mist" },
  { value: "emerald-night", label: "Emerald Moss" },
];

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

  const [title, setTitle] = useState("밤의 장면을 엮은 한 권");
  const [subtitle, setSubtitle] = useState("꿈에서만 지나간 장면들의 기록");
  const [coverPhrase, setCoverPhrase] = useState("희미해지기 전에 붙잡아 둔 꿈의 조각들");
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
        title="선택된 꿈일기가 없습니다"
        description="My Books에서 여러 꿈일기를 고른 뒤 책 초안 만들기로 넘어오면 여기에서 책 초안을 구성할 수 있습니다."
        action={
          <Link href="/book-drafts" className="primary-button">
            My Books로 이동
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="section-kicker">Curate Your Collection</p>
        <h1 className="page-title mt-4">Curate Your Collection</h1>
        <p className="page-copy mx-auto mt-5 max-w-2xl italic">
          선택한 꿈일기를 한 권의 흐름으로 묶고, 표지와 순서를 다듬은 뒤 Book Draft를 생성합니다.
        </p>
      </section>

      <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="space-y-8">
          <section className="glass-card p-8">
            <h2 className="font-display text-3xl text-[var(--accent-strong)]">Book Details</h2>
            <div className="mt-8 space-y-6">
              <div>
                <label className="field-label">Main Title</label>
                <input className="field-input font-display text-xl" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div>
                <label className="field-label">Subtitle</label>
                <input className="field-input italic" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
              </div>
              <div>
                <label className="field-label">Cover Phrase</label>
                <textarea
                  className="field-input min-h-[120px] resize-none italic"
                  value={coverPhrase}
                  onChange={(event) => setCoverPhrase(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="glass-card p-8">
            <h2 className="font-display text-3xl text-[var(--accent-strong)]">Cover Theme</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {coverThemes.map((theme) => {
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
                  <p className="section-kicker">Preview</p>
                  <h3 className="mt-4 font-display text-4xl leading-tight text-[var(--accent-strong)]">{title}</h3>
                  <p className="mt-3 italic text-[var(--muted-strong)]">{subtitle}</p>
                </div>
                <p className="text-sm italic leading-7 text-[var(--muted-strong)]">{coverPhrase}</p>
              </div>
            </div>

            {localError ? <div className="mt-6 rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{localError}</div> : null}

            <div className="mt-6 flex flex-col gap-3">
              <button className="primary-button w-full py-4" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? "초안을 생성하는 중..." : "Generate Book Draft"}
              </button>
              <Link href="/dreams" className="secondary-button w-full py-4">
                Add More Entries
              </Link>
            </div>
          </section>
        </aside>

        <section>
          <div className="mb-8 flex items-center justify-between gap-4 px-2">
            <div>
              <p className="section-kicker">Selected Entries</p>
              <h2 className="mt-3 font-display text-4xl text-[var(--accent-strong)]">Included Dreams</h2>
            </div>
            <span className="rounded-full bg-white/70 px-4 py-2 text-sm text-[var(--muted-strong)]">{orderedDreams.length} entries</span>
          </div>

          {dreamsQuery.isLoading ? (
            <StatePanel title="선택한 꿈일기를 정리하는 중" description="책 흐름에 맞는 순서 편집 화면을 준비하고 있습니다." />
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
                    <p className="font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Scene {String(index + 1).padStart(2, "0")}</p>
                    <p className="mt-2 italic">{formatDate(dream.dream_date)}</p>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-5">
                    <img
                      src={resolveMediaUrl(dream.representative_image_url)}
                      alt={dream.title}
                      className="h-28 w-24 rounded-[18px] object-cover shadow-[0_20px_30px_rgba(108,95,142,0.12)]"
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
                      Up
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
                      Down
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
