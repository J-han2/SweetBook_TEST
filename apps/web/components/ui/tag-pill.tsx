import { Tag } from "@/lib/types";

const categoryClasses: Record<Tag["category"], string> = {
  emotion: "bg-[rgba(245,215,223,0.7)] text-[#8d4c58]",
  event: "bg-[rgba(220,232,251,0.72)] text-[#4d6786]",
  symbol: "bg-[rgba(239,225,198,0.82)] text-[#6b5d45]",
  relation: "bg-[rgba(226,239,220,0.82)] text-[#54705d]",
  custom: "bg-[rgba(229,220,250,0.82)] text-[#6b4f8e]",
};

export function TagPill({ tag }: { tag: Tag }) {
  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${categoryClasses[tag.category]}`}>#{tag.name}</span>;
}
