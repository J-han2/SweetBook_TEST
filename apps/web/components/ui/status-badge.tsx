import { BookDraftStatus, OrderStatus } from "@/lib/types";
import { bookDraftStatusLabel, orderStatusLabel } from "@/lib/utils";

export function StatusBadge({ status }: { status: BookDraftStatus | OrderStatus }) {
  const styles =
    status === "finalized" || status === "completed"
      ? "bg-[rgba(226,239,220,0.92)] text-[#49684f]"
      : status === "pending" || status === "draft"
        ? "bg-[rgba(239,225,198,0.92)] text-[#6d5c3e]"
        : status === "processing"
          ? "bg-[rgba(220,232,251,0.92)] text-[#4d6786]"
          : "bg-[rgba(245,215,223,0.92)] text-[#8f4854]";

  const label = status === "draft" || status === "finalized" ? bookDraftStatusLabel(status) : orderStatusLabel(status);

  return <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${styles}`}>{label}</span>;
}
