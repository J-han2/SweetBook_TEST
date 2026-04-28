"use client";

import { useRouter } from "next/navigation";

import { TagPill } from "@/components/ui/tag-pill";
import { DreamEntrySummary } from "@/lib/types";
import { formatDate, resolveMediaUrl } from "@/lib/utils";

export function DreamCard({
  dream,
  href,
  selectable = false,
  selected = false,
  onToggle,
}: {
  dream: DreamEntrySummary;
  href?: string;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: number) => void;
}) {
  const router = useRouter();
  const destination = href ?? `/dreams/${dream.id}`;
  const floatingClass =
    dream.id % 3 === 0
      ? "md:-rotate-[0.5deg] md:translate-y-1.5"
      : dream.id % 2 === 0
        ? "md:rotate-[0.45deg] md:-translate-y-0.5"
        : "md:-rotate-[0.35deg] md:translate-y-0.5";
  const previewTags = dream.tags.slice(0, 3);
  const remainingTagCount = Math.max(dream.tags.length - previewTags.length, 0);

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => router.push(destination)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(destination);
        }
      }}
      className={`group glass-card interactive-card archive-card-frame relative h-full cursor-pointer overflow-hidden self-start transition-all duration-700 ease-out focus-visible:outline-none ${floatingClass} md:hover:-translate-y-2 md:hover:rotate-0 md:focus-visible:-translate-y-2 md:focus-visible:rotate-0`}
    >
      <div className="flex h-full min-h-[32rem] flex-col overflow-hidden rounded-[28px]">
        <div className="relative h-64 overflow-hidden">
          <img
            src={resolveMediaUrl(dream.representative_image_url)}
            alt={dream.title}
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
            style={{
              maskImage: "linear-gradient(to bottom, black 76%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 76%, transparent 100%)",
            }}
          />

          <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.22)_48%,rgba(255,255,255,0.5)_78%,rgba(255,255,255,0.74)_100%)]" />

          {selectable ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggle?.(dream.id);
              }}
              onKeyDown={(event) => event.stopPropagation()}
              className={`absolute right-4 top-4 z-10 rounded-full px-4 py-2 text-xs font-semibold transition ${
                selected
                  ? "bg-[linear-gradient(135deg,#7b63b6_0%,#a183d8_48%,#efb9df_100%)] text-white"
                  : "border border-white/80 bg-white/72 text-[var(--accent-strong)]"
              }`}
            >
              {selected ? "선택됨" : "책에 담기"}
            </button>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col bg-[rgba(255,255,255,0.74)] px-4 pb-4 pt-3">
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(255,255,255,0.62)_100%)] px-3 py-3 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.74)_100%)] group-focus-visible:bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.74)_100%)]">
            <div className="absolute inset-x-3 top-0 h-px origin-left scale-x-150 bg-[linear-gradient(90deg,rgba(122,104,173,0),rgba(122,104,173,0.48),rgba(122,104,173,0))] opacity-40 transition duration-500 group-hover:scale-x-100 group-hover:opacity-100 group-focus-visible:scale-x-100 group-focus-visible:opacity-100" />

            <div className="min-w-0">
              <p className="dream-meta transition duration-300 group-hover:text-[var(--accent-strong)] group-focus-visible:text-[var(--accent-strong)]">
                {formatDate(dream.dream_date)}
              </p>
              <h3 className="mt-2.5 min-h-[4rem] overflow-hidden font-display text-[28px] leading-tight text-[var(--accent-strong)] transition duration-300 group-hover:translate-x-0.5 group-hover:text-[#5f4a8b] group-focus-visible:translate-x-0.5 group-focus-visible:text-[#5f4a8b] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {dream.title}
              </h3>
            </div>

            <p className="relative mt-4 min-h-[7.2rem] overflow-hidden text-sm leading-7 text-[var(--muted-strong)] transition duration-300 group-hover:text-[var(--text)] group-focus-visible:text-[var(--text)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
              {dream.content_preview}
            </p>

            <div className="mt-4 flex min-h-[2.5rem] flex-wrap content-start gap-2">
              {previewTags.map((tag) => (
                <span key={`${dream.id}-${tag.id}`} className="transition duration-300 group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5">
                  <TagPill tag={tag} />
                </span>
              ))}
              {remainingTagCount ? (
                <span className="rounded-full bg-white/68 px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition duration-300 group-hover:-translate-y-0.5 group-hover:text-[var(--accent-strong)] group-focus-visible:-translate-y-0.5 group-focus-visible:text-[var(--accent-strong)]">
                  +{remainingTagCount}
                </span>
              ) : null}
            </div>

          </div>
        </div>
      </div>
    </article>
  );
}
