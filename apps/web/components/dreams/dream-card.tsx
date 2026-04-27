"use client";

import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const floatingClass =
    dream.id % 3 === 0
      ? "md:-rotate-[1.1deg] md:translate-y-3"
      : dream.id % 2 === 0
        ? "md:rotate-[1deg] md:-translate-y-1"
        : "md:-rotate-[0.9deg] md:translate-y-1";

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/dreams/${dream.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/dreams/${dream.id}`);
        }
      }}
      className={`group glass-card interactive-card archive-card-frame relative cursor-pointer self-start transition-all duration-700 ease-out focus-visible:outline-none ${floatingClass} md:hover:-translate-y-2 md:hover:rotate-0 md:focus-visible:-translate-y-2 md:focus-visible:rotate-0`}
    >
      <div className="overflow-hidden rounded-[28px]">
        <div className="relative h-64 overflow-hidden">
          <img
            src={resolveMediaUrl(dream.representative_image_url)}
            alt={dream.title}
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06] group-focus-visible:scale-[1.06]"
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
                  ? "bg-[linear-gradient(135deg,#6c618a_0%,#7e73a0_48%,#9389b7_100%)] text-white"
                  : "border border-white/80 bg-white/72 text-[var(--accent-strong)]"
              }`}
            >
              {selected ? "선택됨" : "책에 담기"}
            </button>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col bg-[rgba(255,255,255,0.74)] px-8 pb-8 pt-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="dream-meta">{formatDate(dream.dream_date)}</p>
              <h3 className="mt-3 font-display text-[28px] leading-tight text-[var(--accent-strong)]">{dream.title}</h3>
            </div>
          </div>

          <div className="grid translate-y-2 opacity-0 [grid-template-rows:0fr] transition-[grid-template-rows,opacity,transform,padding] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:grid-rows-[1fr] group-hover:translate-y-0 group-hover:opacity-100 group-hover:pt-5 group-focus-visible:grid-rows-[1fr] group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:pt-5 max-md:grid-rows-[1fr] max-md:translate-y-0 max-md:opacity-100 max-md:pt-5">
            <div className="overflow-hidden">
              <p className="text-sm leading-7 text-[var(--muted-strong)]">{dream.content_preview}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {dream.tags.slice(0, 4).map((tag) => (
                  <TagPill key={`${dream.id}-${tag.id}`} tag={tag} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
