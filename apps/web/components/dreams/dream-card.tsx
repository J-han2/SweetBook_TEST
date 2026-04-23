import Link from "next/link";

import { TagPill } from "@/components/ui/tag-pill";
import { DreamEntrySummary } from "@/lib/types";
import { formatDate, resolveMediaUrl } from "@/lib/utils";

export function DreamCard({
  dream,
  selectable = false,
  selected = false,
  onToggle,
}: {
  dream: DreamEntrySummary;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: number) => void;
}) {
  const floatingClass =
    dream.id % 3 === 0
      ? "md:-rotate-[1.1deg] md:translate-y-3"
      : dream.id % 2 === 0
        ? "md:rotate-[1deg] md:-translate-y-1"
        : "md:-rotate-[0.9deg] md:translate-y-1";

  return (
    <article
      className={`group glass-card self-start overflow-hidden transition-all duration-700 ease-out hover:shadow-[var(--shadow-strong)] focus-within:shadow-[var(--shadow-strong)] ${floatingClass} md:hover:-translate-y-2 md:hover:rotate-0 md:focus-within:-translate-y-2 md:focus-within:rotate-0`}
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={resolveMediaUrl(dream.representative_image_url)}
          alt={dream.title}
          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06] group-focus-within:scale-[1.06]"
          style={{
            maskImage: "linear-gradient(to bottom, black 76%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 76%, transparent 100%)",
          }}
        />

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(250,248,245,0.92)] to-transparent" />

        {selectable ? (
          <button
            type="button"
            onClick={() => onToggle?.(dream.id)}
            className={`absolute right-4 top-4 rounded-full px-4 py-2 text-xs font-semibold transition ${
              selected
                ? "bg-[var(--accent)] text-white shadow-[0_18px_34px_rgba(108,95,142,0.22)]"
                : "border border-white/80 bg-white/72 text-[var(--accent-strong)]"
            }`}
          >
            {selected ? "선택됨" : "책에 담기"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-8 pb-8 pt-2">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="dream-meta">{formatDate(dream.dream_date)}</p>
            <h3 className="mt-3 font-display text-[28px] leading-tight text-[var(--accent-strong)]">{dream.title}</h3>
          </div>

          {dream.is_seed ? (
            <span className="rounded-full bg-[rgba(232,222,253,0.9)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
              Seed
            </span>
          ) : null}
        </div>

        <div className="grid transition-[grid-template-rows,opacity,transform,padding] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] max-md:grid-rows-[1fr] max-md:translate-y-0 max-md:opacity-100 max-md:pt-5 group-hover:grid-rows-[1fr] group-hover:translate-y-0 group-hover:opacity-100 group-hover:pt-5 group-focus-within:grid-rows-[1fr] group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:pt-5 [grid-template-rows:0fr] translate-y-2 opacity-0 pt-0">
          <div className="overflow-hidden">
            <p className="text-sm leading-7 text-[var(--muted-strong)]">{dream.content_preview}</p>

            {dream.mood_summary ? (
              <p className="mt-4 text-sm italic leading-7 text-[var(--muted)]">“{dream.mood_summary}”</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              {dream.tags.slice(0, 4).map((tag) => (
                <TagPill key={`${dream.id}-${tag.id}`} tag={tag} />
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 border-t border-[rgba(122,97,146,0.1)] pt-5">
              <p className="truncate text-sm italic text-[var(--muted)]">{dream.memo || "짧은 메모가 아직 없습니다."}</p>
              <Link href={`/dreams/${dream.id}`} className="text-sm font-semibold text-[var(--accent-strong)] hover:underline">
                자세히 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
