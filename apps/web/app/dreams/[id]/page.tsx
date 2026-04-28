"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { StatePanel } from "@/components/ui/state-panel";
import { TagPill } from "@/components/ui/tag-pill";
import { api } from "@/lib/api";
import { DreamEntryDetail } from "@/lib/types";
import { formatDate, resolveMediaUrl } from "@/lib/utils";

const DEFAULT_NAV_PAGE_SIZE = 200;
const DETAIL_ENTER_DURATION_MS = 420;
const DETAIL_LEAVE_DURATION_MS = 160;
const DETAIL_FADE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const DETAIL_LOADING_SURFACE = "transparent";

function DreamContentPlaceholder() {
  return <div className="min-h-[72vh]" />;
}

function DreamContent({
  dream,
  isLeaving,
  returnIds,
  isAddMode,
}: {
  dream: DreamEntryDetail;
  isLeaving: boolean;
  returnIds: string | null;
  isAddMode: boolean;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const imageSrc = resolveMediaUrl(dream.representative_image_url);

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteDreamEntry(dream.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dreams"] });
      router.push("/dreams");
    },
  });

  useEffect(() => {
    setImgLoaded(false);
    setRevealed(false);
  }, [imageSrc, dream.id]);

  useEffect(() => {
    if (imageRef.current?.complete) {
      setImgLoaded(true);
    }
  }, [imageSrc]);

  useEffect(() => {
    if (isLeaving) {
      setRevealed(false);
      return;
    }

    if (!imgLoaded) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setRevealed(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [imgLoaded, isLeaving]);

  return (
    <div className="relative min-h-[72vh]">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-200 ${revealed ? "opacity-0" : "opacity-100"}`}
        style={{ background: DETAIL_LOADING_SURFACE }}
      />

      <div
        className={`grid items-start gap-8 transition-opacity lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${revealed ? "opacity-100" : "opacity-0"}`}
        style={{
          minHeight: "72vh",
          transitionDuration: `${isLeaving ? DETAIL_LEAVE_DURATION_MS : DETAIL_ENTER_DURATION_MS}ms`,
          transitionTimingFunction: DETAIL_FADE_EASING,
        }}
      >
        <div
          className={`overflow-hidden rounded-[28px] lg:sticky lg:top-8 ${imgLoaded ? "bg-[rgba(232,222,253,0.18)]" : ""}`}
          style={!imgLoaded ? { background: DETAIL_LOADING_SURFACE } : undefined}
        >
          <div
            className="relative aspect-video w-full overflow-hidden lg:aspect-[3/4]"
            style={{ background: imgLoaded ? "rgba(232, 222, 253, 0.1)" : "transparent" }}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt={dream.title}
              className="h-full w-full object-cover"
              style={{ background: "transparent" }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
            />
          </div>
        </div>

        <article className={`relative overflow-hidden ${imgLoaded ? "glass-card p-8 md:p-10" : "border-transparent bg-transparent p-0"}`}>
          <div className="relative flex min-h-[20rem] flex-col gap-8 md:min-h-[26rem] lg:min-h-[36rem]">
            <header>
              <p className="section-kicker">{formatDate(dream.dream_date)}</p>
              <h1 className="mt-4 font-display text-4xl leading-tight text-[var(--accent-strong)] md:text-5xl">{dream.title}</h1>

              {dream.tags.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {dream.tags.map((tag) => (
                    <TagPill key={tag.id} tag={tag} />
                  ))}
                </div>
              ) : null}
            </header>

            <div className="flex-1 space-y-6 text-base leading-9 text-[var(--muted-strong)]">
              {dream.content
                .split("\n")
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={`${dream.id}-${index}`}>{paragraph}</p>
                ))}
            </div>

            <div className="mt-auto flex flex-wrap justify-end gap-3">
              <Link href={`/dreams/${dream.id}/edit`} className="secondary-button">
                수정
              </Link>
              <button
                type="button"
                className="danger-button disabled:cursor-not-allowed disabled:opacity-45"
                disabled={isAddMode}
                onClick={() => {
                  if (isAddMode) {
                    return;
                  }
                  if (window.confirm("이 기록을 삭제할까요?")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                삭제
              </button>
              {!isAddMode ? (
                <Link
                  href={(() => {
                    const merged = Array.from(new Set([...(returnIds ? returnIds.split(",").map(Number).filter(Boolean) : []), dream.id]));
                    return `/book-drafts?ids=${merged.join(",")}`;
                  })()}
                  className="primary-button"
                >
                  책에 담기
                </Link>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

export default function DreamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dreamId = Number(params.id);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeoutRef = useRef<number | null>(null);

  const returnIds = searchParams.get("returnIds");
  const addToDraftId = searchParams.get("addToDraft");
  const addToOrderId = searchParams.get("orderId");
  const returnToOrderId = searchParams.get("returnToOrder");
  const isAddMode = !!addToDraftId;
  const selectedTags = searchParams.getAll("tags");
  const q = searchParams.get("q") ?? undefined;
  const dateFrom = searchParams.get("date_from") ?? undefined;
  const dateTo = searchParams.get("date_to") ?? undefined;
  const sort = searchParams.get("sort") ?? "dream_date_desc";
  const contextPage = Number(searchParams.get("page")) || 1;
  const contextPageSize = Number(searchParams.get("page_size")) || 9;
  const hasExplicitContext =
    searchParams.has("page") ||
    searchParams.has("q") ||
    searchParams.has("tags") ||
    searchParams.has("date_from") ||
    searchParams.has("date_to") ||
    searchParams.has("sort");

  const navigationPage = hasExplicitContext ? contextPage : 1;
  const navigationPageSize = hasExplicitContext ? contextPageSize : DEFAULT_NAV_PAGE_SIZE;

  const backParams = useMemo(() => {
    const paramsForBack = new URLSearchParams();
    if (q) paramsForBack.set("q", q);
    selectedTags.forEach((tag) => paramsForBack.append("tags", tag));
    if (dateFrom) paramsForBack.set("date_from", dateFrom);
    if (dateTo) paramsForBack.set("date_to", dateTo);
    paramsForBack.set("sort", sort);
    paramsForBack.set("page", String(navigationPage));
    paramsForBack.set("page_size", String(navigationPageSize));
    if (addToOrderId) paramsForBack.set("orderId", addToOrderId);
    return paramsForBack;
  }, [addToOrderId, dateFrom, dateTo, navigationPage, navigationPageSize, q, selectedTags, sort]);

  const archiveHref = isAddMode
    ? `/book-drafts/${addToDraftId}/add-dreams${backParams.toString() ? `?${backParams.toString()}` : ""}`
    : returnToOrderId
      ? `/orders/${returnToOrderId}`
      : "/dreams";

  const dreamQuery = useQuery({
    queryKey: ["dream", dreamId],
    queryFn: () => api.getDreamEntry(dreamId),
    enabled: Number.isFinite(dreamId),
    staleTime: 30_000,
  });

  const neighborQuery = useQuery({
    queryKey: [
      "dreams-nav",
      {
        q,
        tags: selectedTags,
        dateFrom,
        dateTo,
        sort,
        page: navigationPage,
        pageSize: navigationPageSize,
      },
    ],
    queryFn: () =>
      api.listDreamEntries({
        q: q || undefined,
        tags: selectedTags.length ? selectedTags : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort,
        page: navigationPage,
        page_size: navigationPageSize,
      }),
  });

  const items = neighborQuery.data?.items ?? [];
  const totalPages = neighborQuery.data?.total_pages ?? 1;
  const currentIndex = items.findIndex((item) => item.id === dreamId);
  const isFirstOnPage = currentIndex === 0 && navigationPage > 1;
  const isLastOnPage = currentIndex === items.length - 1 && currentIndex >= 0 && navigationPage < totalPages;

  const prevPageQuery = useQuery({
    queryKey: ["dreams-nav", { q, tags: selectedTags, dateFrom, dateTo, sort, page: navigationPage - 1, pageSize: navigationPageSize }],
    queryFn: () =>
      api.listDreamEntries({
        q: q || undefined,
        tags: selectedTags.length ? selectedTags : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort,
        page: navigationPage - 1,
        page_size: navigationPageSize,
      }),
    enabled: isFirstOnPage,
  });

  const nextPageQuery = useQuery({
    queryKey: ["dreams-nav", { q, tags: selectedTags, dateFrom, dateTo, sort, page: navigationPage + 1, pageSize: navigationPageSize }],
    queryFn: () =>
      api.listDreamEntries({
        q: q || undefined,
        tags: selectedTags.length ? selectedTags : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort,
        page: navigationPage + 1,
        page_size: navigationPageSize,
      }),
    enabled: isLastOnPage,
  });

  let prevId: number | null = null;
  let prevNavPage = navigationPage;
  let nextId: number | null = null;
  let nextNavPage = navigationPage;

  if (currentIndex >= 0) {
    if (currentIndex > 0) {
      prevId = items[currentIndex - 1].id;
    } else if (isFirstOnPage && prevPageQuery.data) {
      const prevItems = prevPageQuery.data.items;
      if (prevItems.length > 0) {
        prevId = prevItems[prevItems.length - 1].id;
        prevNavPage = navigationPage - 1;
      }
    }

    if (currentIndex < items.length - 1) {
      nextId = items[currentIndex + 1].id;
    } else if (isLastOnPage && nextPageQuery.data) {
      const nextItems = nextPageQuery.data.items;
      if (nextItems.length > 0) {
        nextId = nextItems[0].id;
        nextNavPage = navigationPage + 1;
      }
    }
  }

  const baseParams = useMemo(() => {
    const paramsForNav = new URLSearchParams();
    if (q) paramsForNav.set("q", q);
    selectedTags.forEach((tag) => paramsForNav.append("tags", tag));
    if (dateFrom) paramsForNav.set("date_from", dateFrom);
    if (dateTo) paramsForNav.set("date_to", dateTo);
    paramsForNav.set("sort", sort);
    paramsForNav.set("page_size", String(navigationPageSize));
    if (addToDraftId) paramsForNav.set("addToDraft", addToDraftId);
    if (addToOrderId) paramsForNav.set("orderId", addToOrderId);
    if (returnToOrderId) paramsForNav.set("returnToOrder", returnToOrderId);
    if (returnIds) paramsForNav.set("returnIds", returnIds);
    return paramsForNav;
  }, [addToDraftId, addToOrderId, dateFrom, dateTo, navigationPageSize, q, returnIds, returnToOrderId, selectedTags, sort]);

  function buildNavUrl(id: number, navPage: number, navDirection: "prev" | "next") {
    const paramsForNav = new URLSearchParams(baseParams);
    paramsForNav.set("page", String(navPage));
    paramsForNav.set("nav", navDirection);
    return `/dreams/${id}?${paramsForNav.toString()}`;
  }

  const prevHref = prevId ? buildNavUrl(prevId, prevNavPage, "prev") : null;
  const nextHref = nextId ? buildNavUrl(nextId, nextNavPage, "next") : null;

  useEffect(() => {
    setIsNavigating(false);
    if (navigationTimeoutRef.current) {
      window.clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, [dreamId]);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  function navigateWithFade(href: string | null) {
    if (!href || isNavigating) {
      return;
    }

    setIsNavigating(true);
    if (navigationTimeoutRef.current) {
      window.clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = window.setTimeout(() => {
      router.push(href);
    }, DETAIL_LEAVE_DURATION_MS);
  }

  useEffect(() => {
    if (prevHref) {
      router.prefetch(prevHref);
    }
    if (nextHref) {
      router.prefetch(nextHref);
    }
  }, [nextHref, prevHref, router]);

  const dream = dreamQuery.data;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Link href={archiveHref} className="secondary-button inline-flex items-center gap-2">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
            <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          이전 화면으로
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateWithFade(prevHref)}
            disabled={!prevHref || isNavigating}
            className="secondary-button inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            이전
          </button>
          <button
            type="button"
            onClick={() => navigateWithFade(nextHref)}
            disabled={!nextHref || isNavigating}
            className="secondary-button inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {dreamQuery.isError || (!dreamQuery.isLoading && !dream) ? (
        <StatePanel title="꿈 이야기를 찾을 수 없어요" description="이미 삭제했거나 잘못된 주소일 수 있어요." />
      ) : dream ? (
        <DreamContent key={`${dreamId}-${searchParams.get("nav") ?? "initial"}`} dream={dream} isLeaving={isNavigating} returnIds={returnIds} isAddMode={isAddMode} />
      ) : (
        <DreamContentPlaceholder />
      )}
    </div>
  );
}
