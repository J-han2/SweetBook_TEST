"use client";

import { useRouter } from "next/navigation";

import { TagPill } from "@/components/ui/tag-pill";
import { DreamEntrySummary } from "@/lib/types";
import { formatDate, resolveMediaUrl } from "@/lib/utils";

export function DreamListItem({
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
      className="glass-card interactive-card archive-card-frame flex cursor-pointer flex-col gap-5 p-5 transition duration-300 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none md:flex-row md:items-center md:p-6"
    >
      <img
        src={resolveMediaUrl(dream.representative_image_url)}
        alt={dream.title}
        className="h-36 w-full rounded-[22px] object-cover md:h-28 md:w-24 md:flex-none"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="dream-meta">{formatDate(dream.dream_date)}</p>
            <h3 className="mt-2 font-display text-3xl leading-tight text-[var(--accent-strong)]">{dream.title}</h3>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">{dream.content_preview}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {dream.tags.slice(0, 5).map((tag) => (
            <TagPill key={`${dream.id}-${tag.id}`} tag={tag} />
          ))}
        </div>
      </div>

      {selectable ? (
        <div className="flex flex-col gap-3 md:w-[164px] md:flex-none">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle?.(dream.id);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            className={selected ? "primary-button w-full" : "secondary-button w-full"}
          >
            {selected ? "선택됨" : "책에 담기"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
