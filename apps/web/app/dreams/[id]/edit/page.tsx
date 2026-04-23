"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { DreamForm } from "@/components/dreams/dream-form";
import { StatePanel } from "@/components/ui/state-panel";
import { api } from "@/lib/api";

export default function EditDreamPage() {
  const params = useParams<{ id: string }>();
  const dreamId = Number(params.id);

  const dreamQuery = useQuery({
    queryKey: ["dream", dreamId],
    queryFn: () => api.getDreamEntry(dreamId),
    enabled: Number.isFinite(dreamId),
  });

  if (dreamQuery.isLoading) {
    return <StatePanel title="꿈일기를 불러오는 중" description="수정할 기록과 기존 메모, 이미지를 준비하고 있습니다." />;
  }

  if (dreamQuery.isError || !dreamQuery.data) {
    return <StatePanel title="꿈일기를 찾을 수 없습니다" description="이미 삭제된 기록이거나 잘못된 주소일 수 있습니다." />;
  }

  return <DreamForm mode="edit" initialData={dreamQuery.data} />;
}
