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
    return (
      <StatePanel
        title="Dream is loading"
        description="Preparing the current writing, tags, and image for editing."
      />
    );
  }

  if (dreamQuery.isError || !dreamQuery.data) {
    return (
      <StatePanel
        title="Dream not found"
        description="The entry may have been deleted, or the link might be invalid."
      />
    );
  }

  return <DreamForm mode="edit" initialData={dreamQuery.data} />;
}
