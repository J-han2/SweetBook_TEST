"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DreamCard } from "@/components/dreams/dream-card";
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
      { value: "dream_date_asc", label: "오래된 순" },
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
            날짜, 태그, 키워드로 꿈일기를 다시 탐색하고 장면과 감정을 천천히 다시 읽어볼 수 있습니다.
          </p>
        </div>

        <div className="glass-card p-6 md:p-8">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr_0.7fr]">
            <div className="xl:col-span-2">
              <input
                className="field-input"
                placeholder="제목, 본문, 메모에서 꿈을 찾아보세요"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <SelectPopover value={tag} onChange={setTag} options={tagOptions} placeholder="태그" maxVisibleOptions={10} />

            <CalendarField value={dateFrom} onChange={setDateFrom} placeholder="시작 날짜" />
            <CalendarField value={dateTo} onChange={setDateTo} placeholder="종료 날짜" />
          </div>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              <SelectPopover value={sort} onChange={setSort} options={sortOptions} placeholder="정렬" className="min-w-[170px]" />
              <Link href="/dreams/new" className="primary-button">
                새 꿈 기록
              </Link>
            </div>
          </div>
        </div>
      </section>

      {dreamsQuery.isLoading ? (
        <StatePanel title="꿈 아카이브를 정리하는 중" description="검색 결과와 대표 이미지를 불러오고 있습니다." />
      ) : dreamsQuery.isError ? (
        <StatePanel title="아카이브를 불러오지 못했습니다" description="백엔드 실행 상태와 API 주소를 확인해 주세요." />
      ) : dreams.length === 0 ? (
        <StatePanel
          title="조건에 맞는 꿈이 없습니다"
          description="검색어와 날짜 범위를 바꾸거나, 새 꿈일기를 기록해서 아카이브를 채워 보세요."
          action={
            <Link href="/dreams/new" className="primary-button">
              새 꿈일기 쓰기
            </Link>
          }
        />
      ) : (
        <section className="columns-1 [column-gap:2rem] md:columns-2 xl:columns-3">
          {dreams.map((dream) => (
            <div key={dream.id} className="mb-8 break-inside-avoid">
              <DreamCard dream={dream} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
