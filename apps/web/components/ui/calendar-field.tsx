"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarCell = {
  iso: string | null;
  label: number | null;
};

function parseIsoDate(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplayDate(value: string, placeholder: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return placeholder;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

export function CalendarField({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 296,
  });

  const [displayMonth, setDisplayMonth] = useState(() => {
    const selected = parseIsoDate(value);
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    const selected = parseIsoDate(value);
    if (selected) {
      setDisplayMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [value]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const viewportPadding = 16;
      const width = Math.min(296, window.innerWidth - viewportPadding * 2);
      const minLeft = window.scrollX + viewportPadding;
      const maxLeft = window.scrollX + window.innerWidth - width - viewportPadding;
      const left = Math.min(Math.max(window.scrollX + rect.left, minLeft), maxLeft);

      setMenuStyle({
        top: window.scrollY + rect.bottom + 12,
        left,
        width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  const today = new Date();
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
      }).format(displayMonth),
    [displayMonth],
  );

  const cells = useMemo<CalendarCell[]>(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items: CalendarCell[] = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      items.push({ iso: null, label: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({ iso: toIsoDate(year, month, day), label: day });
    }

    while (items.length % 7 !== 0) {
      items.push({ iso: null, label: null });
    }

    return items;
  }, [displayMonth]);

  return (
    <div ref={rootRef} className={className}>
      <button
        ref={triggerRef}
        type="button"
        className={`field-input relative flex min-h-[50px] w-full items-center justify-between gap-4 pr-12 text-left ${
          open ? "bg-white/88 shadow-[0_0_0_4px_rgba(232,222,253,0.42)]" : ""
        }`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? "text-[var(--text)]" : "text-[rgba(120,109,130,0.68)]"}>
          {formatDisplayDate(value, placeholder)}
        </span>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--accent-strong)]">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3.5" y="5" width="13" height="11.5" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 3.5V6.5M13.5 3.5V6.5M3.5 8.5H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="dropdown-popover absolute z-[40] overflow-hidden rounded-[22px] border border-[rgba(122,97,146,0.14)] bg-[rgba(255,255,255,0.96)] p-3.5 shadow-[0_24px_56px_rgba(114,91,125,0.16)] backdrop-blur-xl"
              style={{
                top: `${menuStyle.top}px`,
                left: `${menuStyle.left}px`,
                width: `${menuStyle.width}px`,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  className="secondary-button h-9 w-9 rounded-full px-0 py-0"
                  onClick={() =>
                    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                  }
                  aria-label="이전 달"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.75 5.5L7.25 10L11.75 14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <p className="font-display text-[1.35rem] text-[var(--accent-strong)]">{monthLabel}</p>

                <button
                  type="button"
                  className="secondary-button h-9 w-9 rounded-full px-0 py-0"
                  onClick={() =>
                    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                  }
                  aria-label="다음 달"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.25 5.5L12.75 10L8.25 14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold tracking-[0.16em] text-[var(--muted)]">
                {weekdays.map((weekday) => (
                  <span key={weekday} className="py-1.5">
                    {weekday}
                  </span>
                ))}
              </div>

              <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                {cells.map((cell, index) => {
                  if (!cell.iso || !cell.label) {
                    return <span key={`empty-${index}`} className="h-9 rounded-full" />;
                  }

                  const active = cell.iso === value;
                  const isToday = cell.iso === toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      className={`h-9 rounded-full text-[13px] transition ${
                        active
                          ? "bg-[var(--accent)] text-white shadow-[0_12px_24px_rgba(108,95,142,0.2)]"
                          : isToday
                            ? "border border-[rgba(108,95,142,0.18)] bg-[rgba(232,222,253,0.5)] text-[var(--accent-strong)]"
                            : "text-[var(--muted-strong)] hover:bg-[rgba(245,241,251,0.9)]"
                      }`}
                      onClick={() => {
                        onChange(cell.iso!);
                        setOpen(false);
                      }}
                    >
                      {cell.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(122,97,146,0.12)] pt-3">
                <button
                  type="button"
                  className="secondary-button px-4 py-2 text-xs"
                  onClick={() => {
                    const now = new Date();
                    onChange(toIsoDate(now.getFullYear(), now.getMonth(), now.getDate()));
                    setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    setOpen(false);
                  }}
                >
                  오늘
                </button>

                {value ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--muted-strong)]"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                  >
                    지우기
                  </button>
                ) : (
                  <span />
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
