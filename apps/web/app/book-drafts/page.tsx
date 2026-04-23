"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DreamCard } from "@/components/dreams/dream-card";
import { SelectPopover } from "@/components/ui/select-popover";
import { StatePanel } from "@/components/ui/state-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { coverThemeClasses, formatDate, themeLabel } from "@/lib/utils";

export default function BookDraftsPage() {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("dream_date_desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const deferredSearch = useDeferredValue(search);

  const draftsQuery = useQuery({
    queryKey: ["book-drafts"],
    queryFn: api.listBookDrafts,
  });

  const dreamsQuery = useQuery({
    queryKey: ["book-builder", deferredSearch, tag, sort],
    queryFn: () =>
      api.listDreamEntries({
        q: deferredSearch || undefined,
        tag: tag || undefined,
        sort,
      }),
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: api.listTags,
  });

  const drafts = draftsQuery.data?.items ?? [];
  const builderDreams = dreamsQuery.data?.items ?? [];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const tagOptions = useMemo(
    () => [{ value: "", label: "전체 태그" }, ...((tagsQuery.data ?? []).map((item) => ({ value: item.name, label: item.name })))],
    [tagsQuery.data],
  );
  const sortOptions = useMemo(
    () => [
      { value: "dream_date_desc", label: "최신순" },
      { value: "dream_date_asc", label: "오래된 순" },
    ],
    [],
  );

  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <div>
          <p className="section-kicker">My Books</p>
          <h1 className="page-title mt-4">Start a New Book</h1>
          <p className="page-copy mt-5 max-w-3xl">
            이제 책 만들기 흐름은 My Books 안에서 시작합니다. 꿈일기를 골라 초안을 만들고, 그 아래에서 기존 Book Draft도 함께 관리할 수 있습니다.
          </p>
        </div>

        <div className="glass-card p-6 md:p-8">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.7fr_auto]">
            <input
              className="field-input"
              placeholder="책에 담고 싶은 꿈을 검색해 보세요"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <SelectPopover value={tag} onChange={setTag} options={tagOptions} placeholder="태그" maxVisibleOptions={10} />
            <SelectPopover value={sort} onChange={setSort} options={sortOptions} placeholder="정렬" className="min-w-[170px]" />

            <Link
              href={selectedIds.length ? `/book-drafts/new?ids=${selectedIds.join(",")}` : "#"}
              className={`primary-button min-w-[180px] ${selectedIds.length ? "" : "pointer-events-none opacity-50"}`}
            >
              책 초안 만들기 ({selectedIds.length})
            </Link>
          </div>

          <div className="mt-6">
            {dreamsQuery.isLoading ? (
              <StatePanel title="책에 담을 꿈을 정리하는 중" description="선택 가능한 꿈일기 목록을 불러오고 있습니다." />
            ) : builderDreams.length === 0 ? (
              <StatePanel
                title="선택할 수 있는 꿈이 없습니다"
                description="검색어를 바꾸거나 새로운 꿈일기를 먼저 기록해 보세요."
                action={
                  <Link href="/dreams/new" className="primary-button">
                    새 꿈 기록
                  </Link>
                }
              />
            ) : (
              <section className="columns-1 [column-gap:2rem] md:columns-2">
                {builderDreams.map((dream) => (
                  <div key={dream.id} className="mb-8 break-inside-avoid">
                    <DreamCard
                      dream={dream}
                      selectable
                      selected={selectedSet.has(dream.id)}
                      onToggle={(id) => {
                        setSelectedIds((current) =>
                          current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                        );
                      }}
                    />
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </section>

      <section>
        <p className="section-kicker">Curated Collection</p>
        <h2 className="mt-4 font-display text-5xl text-[var(--accent-strong)]">Book Draft Library</h2>
        <p className="page-copy mt-5 max-w-3xl">
          이미 만든 Book Draft는 이 아래에서 계속 다듬을 수 있습니다. 표지, 순서, 상태를 정리한 뒤 Finalize 후 주문으로 이어집니다.
        </p>
      </section>

      {draftsQuery.isLoading ? (
        <StatePanel title="책 초안을 불러오는 중" description="큐레이션된 초안과 포함된 꿈일기 정보를 정리하고 있습니다." />
      ) : draftsQuery.isError ? (
        <StatePanel title="책 초안을 불러오지 못했습니다" description="백엔드 실행 상태와 API 연결을 확인해 주세요." />
      ) : drafts.length === 0 ? (
        <StatePanel title="아직 만든 책 초안이 없습니다" description="위에서 꿈일기를 선택해 첫 Book Draft를 만들어 보세요." />
      ) : (
        <section className="grid gap-8 lg:grid-cols-2">
          {drafts.map((draft) => (
            <article key={draft.id} className="glass-card overflow-hidden">
              <div className={`cover-preview h-48 bg-gradient-to-br ${coverThemeClasses(draft.cover_theme)} p-6`}>
                <div className="flex h-full flex-col justify-between rounded-[24px] border border-white/60 bg-white/30 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="section-kicker">{formatDate(draft.updated_at)}</p>
                      <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--accent-strong)]">{draft.title}</h2>
                    </div>
                    <StatusBadge status={draft.status} />
                  </div>
                  <p className="max-w-xl text-sm italic leading-7 text-[var(--muted-strong)]">{draft.cover_phrase || "표지 문구가 아직 없습니다."}</p>
                </div>
              </div>

              <div className="p-8">
                <p className="text-sm italic text-[var(--muted)]">{draft.subtitle || "부제 없음"}</p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                  <span>{draft.items.length} entries</span>
                  <span>{themeLabel(draft.cover_theme)}</span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/book-drafts/${draft.id}`} className="primary-button">
                    초안 열기
                  </Link>
                  {draft.items[0] ? (
                    <Link href={`/dreams/${draft.items[0].dream_entry.id}`} className="secondary-button">
                      첫 꿈 보기
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
