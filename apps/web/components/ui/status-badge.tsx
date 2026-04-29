import { BookDraftStatus, OrderStatus } from "@/lib/types";
import { bookDraftStatusLabel, orderStatusLabel } from "@/lib/utils";

export function StatusBadge({ status }: { status: BookDraftStatus | OrderStatus }) {
  const styles =
    status === "finalized" || status === "received"
      ? "bg-[rgba(226,239,220,0.92)] text-[#49684f]"
      : status === "pending" || status === "draft"
        ? "bg-[rgba(239,225,198,0.92)] text-[#6d5c3e]"
        : status === "confirmed"
          ? "bg-[rgba(232,222,253,0.92)] text-[#6b5c8d]"
          : status === "cancelled"
            ? "bg-[rgba(245,215,223,0.92)] text-[#8f4854]"
          : status === "processing"
            ? "bg-[rgba(220,232,251,0.92)] text-[#4d6786]"
            : "bg-[rgba(245,228,210,0.94)] text-[#8a5b35]";

  const label = status === "draft" || status === "finalized" ? bookDraftStatusLabel(status) : orderStatusLabel(status);

  return <span className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.08em] ${styles}`}>{label}</span>;
}
