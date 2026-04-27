export type DreamViewMode = "cards" | "list";

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: DreamViewMode;
  onChange: (value: DreamViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-[rgba(122,97,146,0.12)] bg-white/60 p-1">
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          value === "cards" ? "bg-[var(--accent)] text-white shadow-[0_10px_24px_rgba(108,95,142,0.18)]" : "text-[var(--muted-strong)]"
        }`}
      >
        카드형
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          value === "list" ? "bg-[var(--accent)] text-white shadow-[0_10px_24px_rgba(108,95,142,0.18)]" : "text-[var(--muted-strong)]"
        }`}
      >
        리스트형
      </button>
    </div>
  );
}
