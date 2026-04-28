"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Tag } from "@/lib/types";

function rankTagMatch(tagName: string, query: string) {
  const normalizedName = tagName.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return 0;
  }
  if (normalizedName.startsWith(normalizedQuery)) {
    return 0;
  }
  if (normalizedName.includes(normalizedQuery)) {
    return 1;
  }
  return 2;
}

export function TagMultiSelect({
  options,
  values,
  onChange,
  placeholder = "태그 검색",
  maxSuggestions = 3,
  showChips = true,
  className = "",
}: {
  options: Tag[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  maxSuggestions?: number;
  showChips?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 200,
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedSet = useMemo(() => new Set(values), [values]);

  const suggestions = useMemo(() => {
    return options
      .filter((tag) => !selectedSet.has(tag.name))
      .filter((tag) => {
        if (!query.trim()) {
          return true;
        }
        return tag.name.toLowerCase().includes(query.trim().toLowerCase());
      })
      .sort((left, right) => {
        const rankDiff = rankTagMatch(left.name, query) - rankTagMatch(right.name, query);
        if (rankDiff !== 0) {
          return rankDiff;
        }
        return left.name.localeCompare(right.name, "ko");
      })
      .slice(0, maxSuggestions);
  }, [maxSuggestions, options, query, selectedSet]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const viewportPadding = 16;
      const minLeft = window.scrollX + viewportPadding;
      const maxLeft = window.scrollX + window.innerWidth - rect.width - viewportPadding;
      const left = Math.min(Math.max(window.scrollX + rect.left, minLeft), maxLeft);

      setMenuStyle({
        top: window.scrollY + rect.bottom + 8,
        left,
        width: rect.width,
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

    document.addEventListener("mousedown", handlePointer);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
    };
  }, []);

  function addTag(tagName: string) {
    if (selectedSet.has(tagName)) {
      setQuery("");
      setOpen(false);
      return;
    }

    onChange([...values, tagName]);
    setQuery("");
    setOpen(true);
  }

  function removeTag(tagName: string) {
    onChange(values.filter((value) => value !== tagName));
  }

  return (
    <div ref={rootRef} className={className}>
      <div ref={inputRef}>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (suggestions[0]) {
                addTag(suggestions[0].name);
              }
            }

            if (event.key === "Backspace" && !query && values.length) {
              removeTag(values[values.length - 1]);
            }

            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className={`field-input ${open ? "bg-white/88" : ""}`}
        />
      </div>

      {open && query.trim().length > 0 && suggestions.length > 0 && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="dropdown-popover absolute z-[9999] overflow-hidden rounded-[20px] border border-[rgba(122,97,146,0.12)] bg-[rgba(255,255,255,0.96)] backdrop-blur-xl"
              style={{
                top: `${menuStyle.top}px`,
                left: `${menuStyle.left}px`,
                width: `${menuStyle.width}px`,
              }}
            >
              <div className="dream-scrollbar max-h-[240px] overflow-y-auto p-2">
                {suggestions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="flex w-full items-center rounded-[14px] px-4 py-2.5 text-left text-sm text-[var(--muted-strong)] transition hover:bg-[rgba(245,241,251,0.85)]"
                    onClick={() => addTag(tag.name)}
                  >
                    <span>#{tag.name}</span>
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}

      {showChips && values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 px-1">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(232,222,253,0.88)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] transition hover:bg-[rgba(232,222,253,1)]"
              onClick={() => removeTag(value)}
            >
              <span>#{value}</span>
              <span className="text-[10px] leading-none">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
