"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DreamCard } from "@/components/dreams/dream-card";
import { DreamListItem } from "@/components/dreams/dream-list-item";
import { DreamViewMode, ViewModeToggle } from "@/components/dreams/view-mode-toggle";
import { CalendarField } from "@/components/ui/calendar-field";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SelectPopover } from "@/components/ui/select-popover";
import { StatePanel } from "@/components/ui/state-panel";
import { TagMultiSelect } from "@/components/ui/tag-multi-select";
import { api } from "@/lib/api";
import { BookDraftItem } from "@/lib/types";

const PAGE_SIZE = 6;

export function DreamBrowser({
  mode,
  draftId,
  orderId,
}: {
  mode: "archive" | "picker";
  draftId?: number;
  orderId?: number | null;
}) {
  const queryClient = useQueryClient();
  const isPickerMode = mode === "picker";

  const [searchInput, setSearchInput] = useState("");
  const [tagInput, setTagInput] = useState<string[]>([]);
  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");
  const [sortInput, setSortInput] = useState("dream_date_desc");
  const [appliedFilters, setAppliedFilters] = useState({
    q: "",
    tags: [] as string[],
    date_from: "",
    date_to: "",
    sort: "dream_date_desc",
  });
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<DreamViewMode>("cards");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const dreamsQuery = useQuery({
    queryKey: ["dreams", appliedFilters, page],
    queryFn: () =>
      api.listDreamEntries({
        q: appliedFilters.q || undefined,
        tags: appliedFilters.tags.length ? appliedFilters.tags : undefined,
        date_from: appliedFilters.date_from || undefined,
        date_to: appliedFilters.date_to || undefined,
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

  const draftQuery = useQuery({
    queryKey: ["book-draft", draftId],
    queryFn: () => api.getBookDraft(draftId!),
    enabled: isPickerMode && Number.isFinite(draftId),
  });

  const addItemMutation = useMutation({
    mutationFn: (dreamEntryId: number) => api.addBookDraftItem(draftId!, dreamEntryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["book-draft", draftId] }),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => api.removeBookDraftItem(draftId!, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["book-draft", draftId] }),
  });

  const draftItems = draftQuery.data?.items ?? [];
  const addedDreamIds = new Set(draftItems.map((item: BookDraftItem) => item.dream_entry.id));
  const dreamEntryToItemId = new Map(draftItems.map((item: BookDraftItem) => [item.dream_entry.id, item.id]));

  function handleToggle(dreamEntryId: number) {
    const itemId = dreamEntryToItemId.get(dreamEntryId);
    if (itemId !== undefined) {
      removeItemMutation.mutate(itemId);
    } else {
      addItemMutation.mutate(dreamEntryId);
    }
  }

  const dreamPageData = dreamsQuery.data;
  const dreams = dreamPageData?.items ?? [];
  const activeFilterCount =
    (appliedFilters.q ? 1 : 0) +
    appliedFilters.tags.length +
    (appliedFilters.date_from ? 1 : 0) +
    (appliedFilters.date_to ? 1 : 0);

  const sortOptions = useMemo(
    () => [
      { value: "dream_date_desc", label: "최신순" },
      { value: "dream_date_asc", label: "오래된순" },
    ],
    [],
  );

  function buildDreamHref(dreamId: number) {
    const params = new URLSearchParams();
    if (appliedFilters.q) params.set("q", appliedFilters.q);
    appliedFilters.tags.forEach((selectedTag) => params.append("tags", selectedTag));
    if (appliedFilters.date_from) params.set("date_from", appliedFilters.date_from);
    if (appliedFilters.date_to) params.set("date_to", appliedFilters.date_to);
    params.set("sort", appliedFilters.sort);
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));

    if (isPickerMode && draftId) {
      params.set("addToDraft", String(draftId));
      if (orderId) {
        params.set("orderId", String(orderId));
      }
    }

    return `/dreams/${dreamId}?${params.toString()}`;
  }

  function applySearch() {
    setAppliedFilters({
      q: searchInput.trim(),
      tags: tagInput,
      date_from: dateFromInput,
      date_to: dateToInput,
      sort: sortInput,
    });
    setPage(1);
    setIsFilterOpen(false);
  }

  function applySort(value: string) {
    setSortInput(value);
    setAppliedFilters((current) => ({
      ...current,
      sort: value,
    }));
    setPage(1);
  }

  function resetSearch() {
    setSearchInput("");
    setTagInput([]);
    setDateFromInput("");
    setDateToInput("");
    setSortInput("dream_date_desc");
    setAppliedFilters({
      q: "",
      tags: [],
      date_from: "",
      date_to: "",
      sort: "dream_date_desc",
    });
    setPage(1);
    setIsFilterOpen(false);
  }

  const pickerReturnUrl = draftId
    ? `/book-drafts/${draftId}${orderId ? `?orderId=${orderId}` : ""}`
    : "/book-drafts";

  return (
    <div className="space-y-10">
      {isPickerMode ? (
        <section className="rounded-[24px] border border-[rgba(122,97,146,0.14)] bg-white/78 px-6 py-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-[var(--muted-strong)]">
                {draftQuery.data ? `"${draftQuery.data.title}"에 담긴 꿈 ${addedDreamIds.size}개` : `담긴 꿈 ${addedDreamIds.size}개`}
              </p>
            </div>
            <Link href={pickerReturnUrl} className="secondary-button shrink-0">
              이전 화면으로
            </Link>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl leading-tight text-[#6d5d9b] [text-shadow:0_8px_20px_rgba(255,255,255,0.46)] md:text-4xl lg:text-5xl">
              Find your dreams
            </h1>
            <p className="page-copy mt-3 text-[0.98rem]">다시 보고 싶은 꿈을 찾아보세요.</p>
          </div>

          <Link href="/dreams/new" className="primary-button">
            새 꿈 기록
          </Link>
        </section>
      )}

      <section className="rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.56)_0%,rgba(255,255,255,0.36)_100%)] px-5 py-5 backdrop-blur-xl md:px-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <p className="font-medium text-[0.98rem] tracking-[0.01em] text-[var(--muted-strong)]">
                {dreamPageData ? `총 ${dreamPageData.total}개의 기록` : "기록을 찾는 중..."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={isFilterOpen ? "primary-button" : "secondary-button"}
                onClick={() => setIsFilterOpen((current) => !current)}
                aria-expanded={isFilterOpen}
                aria-controls="dream-filter-panel"
              >
                {isFilterOpen ? "닫기" : activeFilterCount ? `필터 ${activeFilterCount}` : "필터"}
              </button>
              <SelectPopover
                value={sortInput}
                onChange={applySort}
                options={sortOptions}
                placeholder="정렬"
                className="min-w-[160px]"
              />
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isFilterOpen ? "opacity-100 [grid-template-rows:1fr]" : "opacity-0 [grid-template-rows:0fr]"
            }`}
          >
            <div className={`overflow-hidden ${isFilterOpen ? "visible" : "invisible pointer-events-none"}`}>
              <form
                id="dream-filter-panel"
                className="space-y-4 border-t border-[rgba(122,97,146,0.12)] pt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  applySearch();
                }}
              >
                <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.84fr)_176px_176px]">
                  <input
                    className="field-input"
                    placeholder="제목, 내용"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                  <TagMultiSelect
                    values={tagInput}
                    onChange={setTagInput}
                    options={tagsQuery.data ?? []}
                    placeholder="태그 검색"
                    showChips={false}
                  />
                  <CalendarField value={dateFromInput} onChange={setDateFromInput} placeholder="시작" />
                  <CalendarField value={dateToInput} onChange={setDateToInput} placeholder="종료" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {tagInput.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(232,222,253,0.88)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] transition hover:bg-[rgba(232,222,253,1)]"
                        onClick={() => setTagInput(tagInput.filter((selectedTag) => selectedTag !== tag))}
                      >
                        <span>#{tag}</span>
                        <span className="text-[10px] leading-none">×</span>
                      </button>
                    ))}
                  </div>

                  <div className="ml-auto flex gap-3">
                    <button type="button" className="secondary-button" onClick={resetSearch}>
                      초기화
                    </button>
                    <button type="submit" className="primary-button" disabled={dreamsQuery.isFetching}>
                      검색
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {dreamsQuery.isLoading && !dreamsQuery.data ? (
        <div className="min-h-[60vh] [animation:loading-panel-in_200ms_ease_350ms_both]">
          <StatePanel title="불러오는 중" description="잠시만 기다려 주세요." />
        </div>
      ) : dreamsQuery.isError ? (
        <StatePanel title="불러오지 못했어요" description="다시 시도해 주세요." />
      ) : dreams.length === 0 ? (
        <StatePanel
          title="조건에 맞는 꿈을 찾지 못했어요"
          description={isPickerMode ? "필터를 바꾸거나 다른 날짜의 꿈을 찾아보세요." : "새로운 꿈을 기록해보세요."}
          action={
            !isPickerMode ? (
              <Link href="/dreams/new" className="primary-button">
                새 꿈 기록
              </Link>
            ) : undefined
          }
        />
      ) : dreamPageData ? (
        <section className="space-y-8">
          {viewMode === "cards" ? (
            <section
              key="cards"
              className="grid items-start gap-8 [animation:view-fade-in_320ms_cubic-bezier(0.22,1,0.36,1)_both] md:grid-cols-2 xl:grid-cols-3"
            >
              {dreams.map((dream) => (
                <div key={dream.id} className="h-full">
                  <DreamCard
                    dream={dream}
                    href={buildDreamHref(dream.id)}
                    selectable={isPickerMode}
                    selected={addedDreamIds.has(dream.id)}
                    onToggle={handleToggle}
                    selectionVariant={isPickerMode ? "picker" : "default"}
                  />
                </div>
              ))}
            </section>
          ) : (
            <section key="list" className="space-y-5 [animation:view-fade-in_320ms_cubic-bezier(0.22,1,0.36,1)_both]">
              {dreams.map((dream) => (
                <DreamListItem
                  key={dream.id}
                  dream={dream}
                  href={buildDreamHref(dream.id)}
                  selectable={isPickerMode}
                  selected={addedDreamIds.has(dream.id)}
                  onToggle={handleToggle}
                  selectionVariant={isPickerMode ? "picker" : "default"}
                />
              ))}
            </section>
          )}

          <PaginationBar
            page={dreamPageData.page}
            totalPages={dreamPageData.total_pages}
            totalItems={dreamPageData.total}
            pageSize={dreamPageData.page_size}
            itemLabel="꿈 기록"
            isFetching={dreamsQuery.isFetching}
            onPageChange={setPage}
            variant="inline"
          />
        </section>
      ) : null}
    </div>
  );
}
