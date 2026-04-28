type PaginationItem = number | "ellipsis";

type PaginationBarVariant = "card" | "inline";

function buildPageItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 4) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (totalPages === 5) {
    return currentPage <= 3 ? [1, 2, 3, "ellipsis", 5] : [1, "ellipsis", 3, 4, 5];
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const ordered = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const items: PaginationItem[] = [];
  ordered.forEach((page, index) => {
    const previous = ordered[index - 1];
    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });
  return items;
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
      {direction === "left" ? (
        <path d="M11.75 5.5L7.25 10L11.75 14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8.25 5.5L12.75 10L8.25 14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel,
  isFetching = false,
  onPageChange,
  variant = "card",
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel: string;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  variant?: PaginationBarVariant;
}) {
  if (!totalItems) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const items = buildPageItems(page, totalPages);
  const pageCounter = `${String(page).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`;

  if (variant === "inline") {
    return (
      <div className="flex flex-col gap-4 border-t border-[rgba(122,97,146,0.12)] pt-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="font-display text-[1.08rem] leading-none tracking-[0.02em] text-[var(--accent-strong)]">
            Page {pageCounter}
          </p>
          <p className="text-sm leading-6 text-[var(--muted)]">
            {isFetching ? " 다음 결과를 준비하고 있어요." : ""}
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-end gap-1.5" aria-label={`${itemLabel} 페이지 이동`}>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--accent-strong)] transition hover:bg-white/70 disabled:text-[rgba(124,112,152,0.34)] disabled:hover:bg-transparent"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="이전 페이지"
          >
            <ArrowIcon direction="left" />
          </button>

          {items.map((item, index) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-2 text-sm text-[var(--muted)]">
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`${item}페이지`}
                className={
                  item === page
                    ? "relative min-w-[34px] rounded-full px-2.5 py-2 text-sm font-semibold text-[var(--accent-strong)] after:absolute after:bottom-[5px] after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[var(--accent-strong)]"
                    : "min-w-[34px] rounded-full px-2.5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-white/62 hover:text-[var(--accent-strong)]"
                }
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--accent-strong)] transition hover:bg-white/70 disabled:text-[rgba(124,112,152,0.34)] disabled:hover:bg-transparent"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="다음 페이지"
          >
            <ArrowIcon direction="right" />
          </button>
        </nav>
      </div>
    );
  }

  return (
    <div className="glass-card flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--accent-strong)]">
          총 {totalItems}개의 {itemLabel}
        </p>
        <p className="text-sm text-[var(--muted)]">
          {start} - {end}번째 {itemLabel}
          {isFetching ? " · 새 결과를 불러오는 중" : ""}
        </p>
      </div>

      <nav className="flex flex-wrap items-center justify-end gap-2" aria-label={`${itemLabel} 페이지 이동`}>
        <button
          type="button"
          className="secondary-button px-4 py-2 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          이전
        </button>

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-2 text-sm text-[var(--muted)]">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={
                item === page
                  ? "primary-button min-w-[44px] px-4 py-2"
                  : "secondary-button min-w-[44px] px-4 py-2"
              }
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className="secondary-button px-4 py-2 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          다음
        </button>
      </nav>
    </div>
  );
}
