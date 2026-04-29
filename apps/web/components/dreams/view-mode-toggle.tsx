export type DreamViewMode = "cards" | "list";

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: DreamViewMode;
  onChange: (value: DreamViewMode) => void;
}) {
  return (
    <div className="relative inline-grid grid-cols-2 rounded-full border border-[rgba(122,97,146,0.12)] bg-white/60 p-1">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[linear-gradient(135deg,#6c618a_0%,#7e73a0_48%,#9389b7_100%)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          value === "list" ? "translate-x-full" : "translate-x-0"
        }`}
      />

      <button
        type="button"
        onClick={() => onChange("cards")}
        className={`relative z-10 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
          value === "cards" ? "text-white" : "text-[var(--muted-strong)]"
        }`}
      >
        카드형
      </button>

      <button
        type="button"
        onClick={() => onChange("list")}
        className={`relative z-10 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
          value === "list" ? "text-white" : "text-[var(--muted-strong)]"
        }`}
      >
        리스트형
      </button>
    </div>
  );
}
