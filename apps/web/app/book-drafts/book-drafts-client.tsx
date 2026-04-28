"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { DreamCard } from "@/components/dreams/dream-card";
import { DreamListItem } from "@/components/dreams/dream-list-item";
import { DreamViewMode, ViewModeToggle } from "@/components/dreams/view-mode-toggle";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SelectPopover } from "@/components/ui/select-popover";
import { StatePanel } from "@/components/ui/state-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { coverThemeClasses, formatDate, themeLabel } from "@/lib/utils";

const PAGE_SIZE = 9;

export function BookDraftsClient() {
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [sortInput, setSortInput] = useState("dream_date_desc");
  const [appliedFilters, setAppliedFilters] = useState({
    q: "",
    tag: "",
    sort: "dream_date_desc",
  });
  const [viewMode, setViewMode] = useState<DreamViewMode>("cards");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);

  const seededIds = useMemo(
    () =>
      (searchParams.get("ids") ?? "")
        .split(",")
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    [searchParams],
  );

  useEffect(() => {
    if (!seededIds.length) {
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...seededIds, ...current])));
  }, [seededIds]);

  const draftsQuery = useQuery({
    queryKey: ["book-drafts"],
    queryFn: api.listBookDrafts,
  });

  const dreamsQuery = useQuery({
    queryKey: ["book-builder", appliedFilters, page],
    queryFn: () =>
      api.listDreamEntries({
        q: appliedFilters.q || undefined,
        tag: appliedFilters.tag || undefined,
        sort: appliedFilters.sort,
        page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: api.listTags,
  });

  const builderPageData = dreamsQuery.data;
  useEffect(() => {
    if (dreamsQuery.data?.page && dreamsQuery.data.page !== page) {
      setPage(dreamsQuery.data.page);
    }
  }, [dreamsQuery.data?.page, page]);

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
      { value: "dream_date_asc", label: "오래된순" },
    ],
    [],
  );

  function applySearch() {
    setAppliedFilters({
      q: searchInput.trim(),
      tag: tagInput,
      sort: sortInput,
    });
    setPage(1);
  }

  function resetSearch() {
    setSearchInput("");
    setTagInput("");
    setSortInput("dream_date_desc");
    setAppliedFilters({
      q: "",
      tag: "",
      sort: "dream_date_desc",
    });
    setPage(1);
  }

  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-kicker">Create Book</p>
            <h1 className="page-title mt-4">Select Dreams for a New Book</h1>
            <p className="page-copy mt-5 max-w-3xl">
              마음에 남는 꿈들을 골라 한 권으로 엮어보세요. 책에 담고 싶은 기록만 차분히 모아 순서를 정리할 수 있어요.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/orders" className="secondary-button">
              내 책장으로
            </Link>
            <Link
              href={selectedIds.length ? `/book-drafts/new?ids=${selectedIds.join(",")}` : "#"}
              className={`primary-button ${selectedIds.length ? "" : "pointer-events-none opacity-50"}`}
            >
              선택한 {selectedIds.length}개로 다음 단계
            </Link>
          </div>
        </div>

        <form
          className="glass-card space-y-5 p-6 md:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr_0.8fr_auto]">
            <input
              className="field-input"
              placeholder="책에 담을 꿈을 검색해보세요"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />

            <SelectPopover value={tagInput} onChange={setTagInput} options={tagOptions} placeholder="태그" maxVisibleOptions={10} />
            <SelectPopover value={sortInput} onChange={setSortInput} options={sortOptions} placeholder="정렬" className="min-w-[190px]" />
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
              <span className="rounded-full bg-white/72 px-4 py-2 text-[var(--muted-strong)]">
                총 {dreamsQuery.data?.total ?? 0}개의 꿈 중에서 선택 중
              </span>
              <span className="rounded-full bg-[rgba(232,222,253,0.82)] px-4 py-2 text-[var(--accent-strong)]">
                {selectedIds.length}개 선택됨
              </span>
              {dreamsQuery.isFetching && dreamsQuery.data ? (
                <span className="rounded-full bg-white/72 px-4 py-2 text-[var(--muted-strong)]">새 결과를 불러오는 중</span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className="secondary-button" onClick={resetSearch}>
                초기화
              </button>
              <button type="submit" className="primary-button" disabled={dreamsQuery.isFetching}>
                검색
              </button>
            </div>
          </div>
        </form>

        {dreamsQuery.isLoading && !dreamsQuery.data ? (
          <StatePanel title="책에 담을 꿈을 불러오는 중" description="선택할 수 있는 꿈 일기를 준비하고 있어요." />
        ) : dreamsQuery.isError ? (
          <StatePanel title="꿈 목록을 불러오지 못했어요" description="잠시 후 다시 시도하거나 검색 조건을 다시 확인해주세요." />
        ) : builderDreams.length === 0 ? (
          <StatePanel
            title="선택할 꿈 일기가 없어요"
            description="검색 조건을 바꿔보거나 먼저 새로운 꿈을 기록해보세요."
            action={
              <Link href="/dreams/new" className="primary-button">
                꿈 기록하기
              </Link>
            }
          />
        ) : builderPageData ? (
          <section className="space-y-6">
            <PaginationBar
              page={builderPageData.page}
              totalPages={builderPageData.total_pages}
              totalItems={builderPageData.total}
              pageSize={builderPageData.page_size}
              itemLabel="꿈"
              isFetching={dreamsQuery.isFetching}
              onPageChange={setPage}
            />

            {viewMode === "cards" ? (
              <section className="columns-1 [column-gap:2rem] md:columns-2 xl:columns-3">
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
            ) : (
              <section className="space-y-5">
                {builderDreams.map((dream) => (
                  <DreamListItem
                    key={dream.id}
                    dream={dream}
                    selectable
                    selected={selectedSet.has(dream.id)}
                    onToggle={(id) => {
                      setSelectedIds((current) =>
                        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                      );
                    }}
                  />
                ))}
              </section>
            )}

            <PaginationBar
              page={builderPageData.page}
              totalPages={builderPageData.total_pages}
              totalItems={builderPageData.total}
              pageSize={builderPageData.page_size}
              itemLabel="꿈"
              isFetching={dreamsQuery.isFetching}
              onPageChange={setPage}
            />
          </section>
        ) : null}
      </section>

      <section>
        <p className="section-kicker">Saved Drafts</p>
        <h2 className="mt-4 font-display text-5xl text-[var(--accent-strong)]">Draft Library</h2>
        <p className="page-copy mt-5 max-w-3xl">
          만들어둔 책이 있다면 여기에서 이어서 편집해보세요. 제목과 문구, 순서를 조금씩 다듬으며 완성도를 높일 수 있어요.
        </p>
      </section>

      {draftsQuery.isLoading ? (
        <StatePanel title="초안 보관함을 불러오는 중" description="저장한 초안과 포함된 꿈 일기를 모으고 있어요." />
      ) : draftsQuery.isError ? (
        <StatePanel title="초안 보관함을 불러오지 못했어요" description="잠시 후 다시 시도해주세요." />
      ) : drafts.length === 0 ? (
        <StatePanel title="저장한 초안이 아직 없어요" description="위에서 꿈 일기를 선택해 첫 책 초안을 만들어보세요." />
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
                  <p className="max-w-xl text-sm italic leading-7 text-[var(--muted-strong)]">
                    {draft.cover_phrase || "아직 표지 문구가 없어요."}
                  </p>
                </div>
              </div>

              <div className="p-8">
                <p className="text-sm italic text-[var(--muted)]">{draft.subtitle || "부제가 아직 없어요."}</p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                  <span>{draft.items.length}개의 꿈</span>
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
