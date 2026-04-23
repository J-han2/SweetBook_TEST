"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SelectOption = {
  value: string;
  label: string;
};

export function SelectPopover({
  value,
  onChange,
  options,
  placeholder,
  maxVisibleOptions = 10,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  maxVisibleOptions?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const viewportPadding = 24;
      const width = rect.width;
      const left = Math.min(rect.left, window.innerWidth - width - viewportPadding);
      setMenuStyle({
        top: window.scrollY + rect.bottom + 12,
        left: window.scrollX + Math.max(viewportPadding, left),
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
        <span className={selectedOption ? "text-[var(--text)]" : "text-[rgba(120,109,130,0.68)]"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--accent-strong)]">
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="dropdown-popover absolute z-[40] overflow-hidden rounded-[24px] border border-[rgba(122,97,146,0.14)] bg-[rgba(255,255,255,0.96)] shadow-[0_26px_60px_rgba(114,91,125,0.18)] backdrop-blur-xl"
              style={{
                top: `${menuStyle.top}px`,
                left: `${menuStyle.left}px`,
                width: `${menuStyle.width}px`,
              }}
            >
              <div
                className="dream-scrollbar overflow-y-auto p-2"
                style={{
                  maxHeight: `${Math.min(Math.max(options.length, 1), maxVisibleOptions) * 44 + 16}px`,
                }}
              >
                {options.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      key={option.value || "__empty"}
                      type="button"
                      className={`flex w-full items-center rounded-[18px] px-4 py-3 text-left text-sm transition ${
                        active
                          ? "bg-[rgba(232,222,253,0.9)] text-[var(--accent-strong)]"
                          : "text-[var(--muted-strong)] hover:bg-[rgba(245,241,251,0.85)]"
                      }`}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
