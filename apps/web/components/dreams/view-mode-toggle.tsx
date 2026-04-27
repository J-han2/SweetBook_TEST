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
          value === "cards"
            ? "bg-[linear-gradient(135deg,#6c618a_0%,#7e73a0_48%,#9389b7_100%)] text-white"
            : "text-[var(--muted-strong)]"
        }`}
      >
        카드형
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          value === "list"
            ? "bg-[linear-gradient(135deg,#6c618a_0%,#7e73a0_48%,#9389b7_100%)] text-white"
            : "text-[var(--muted-strong)]"
        }`}
      >
        리스트형
      </button>
    </div>
  );
}
