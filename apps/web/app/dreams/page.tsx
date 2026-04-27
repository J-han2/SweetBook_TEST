"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DreamCard } from "@/components/dreams/dream-card";
import { DreamListItem } from "@/components/dreams/dream-list-item";
import { DreamViewMode, ViewModeToggle } from "@/components/dreams/view-mode-toggle";
import { CalendarField } from "@/components/ui/calendar-field";
import { SelectPopover } from "@/components/ui/select-popover";
import { StatePanel } from "@/components/ui/state-panel";
import { api } from "@/lib/api";

export default function DreamsPage() {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("dream_date_desc");
  const [viewMode, setViewMode] = useState<DreamViewMode>("cards");
  const deferredSearch = useDeferredValue(search);

  const dreamsQuery = useQuery({
    queryKey: ["dreams", deferredSearch, tag, dateFrom, dateTo, sort],
    queryFn: () =>
      api.listDreamEntries({
        q: deferredSearch || undefined,
        tag: tag || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort,
      }),
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: api.listTags,
  });

  const dreams = dreamsQuery.data?.items ?? [];
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

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div>
          <p className="section-kicker">Archive</p>
          <h1 className="page-title mt-4">Your Archive</h1>
          <p className="page-copy mt-5 max-w-3xl">
            키워드, 태그, 날짜로 꿈일기를 찾아보고 지금의 기분에 맞는 방식으로 차분히 읽어보세요.
          </p>
        </div>

        <div className="glass-card p-6 md:p-8">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr_0.7fr]">
            <div className="xl:col-span-2">
              <input
                className="field-input"
                placeholder="제목과 본문으로 꿈을 찾아보세요"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <SelectPopover value={tag} onChange={setTag} options={tagOptions} placeholder="태그" maxVisibleOptions={10} />
            <CalendarField value={dateFrom} onChange={setDateFrom} placeholder="시작일" />
            <CalendarField value={dateTo} onChange={setDateTo} placeholder="종료일" />
          </div>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              <SelectPopover value={sort} onChange={setSort} options={sortOptions} placeholder="정렬" className="min-w-[190px]" />
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>

            <Link href="/dreams/new" className="primary-button">
              새 꿈 기록
            </Link>
          </div>
        </div>
      </section>

      {dreamsQuery.isLoading ? (
        <StatePanel title="아카이브를 불러오는 중" description="꿈 카드와 태그 정보를 정리하고 있어요." />
      ) : dreamsQuery.isError ? (
        <StatePanel title="아카이브를 불러오지 못했어요" description="백엔드 컨테이너와 API 연결 상태를 확인해 주세요." />
      ) : dreams.length === 0 ? (
        <StatePanel
          title="조건에 맞는 꿈이 없어요"
          description="검색어나 날짜를 바꿔보거나, 새로운 꿈을 기록해 아카이브를 채워보세요."
          action={
            <Link href="/dreams/new" className="primary-button">
              꿈 기록하기
            </Link>
          }
        />
      ) : viewMode === "cards" ? (
        <section className="columns-1 [column-gap:2rem] md:columns-2 xl:columns-3">
          {dreams.map((dream) => (
            <div key={dream.id} className="mb-8 break-inside-avoid">
              <DreamCard dream={dream} />
            </div>
          ))}
        </section>
      ) : (
        <section className="space-y-5">
          {dreams.map((dream) => (
            <DreamListItem key={dream.id} dream={dream} />
          ))}
        </section>
      )}
    </div>
  );
}
