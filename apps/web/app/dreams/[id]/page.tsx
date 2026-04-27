"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { StatePanel } from "@/components/ui/state-panel";
import { TagPill } from "@/components/ui/tag-pill";
import { api } from "@/lib/api";
import { formatDate, resolveMediaUrl } from "@/lib/utils";

export default function DreamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dreamId = Number(params.id);

  const dreamQuery = useQuery({
    queryKey: ["dream", dreamId],
    queryFn: () => api.getDreamEntry(dreamId),
    enabled: Number.isFinite(dreamId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteDreamEntry(dreamId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dreams"] });
      router.push("/dreams");
    },
  });

  if (dreamQuery.isLoading) {
    return <StatePanel title="꿈일기를 불러오는 중" description="선택한 꿈의 본문과 태그를 준비하고 있어요." />;
  }

  if (dreamQuery.isError || !dreamQuery.data) {
    return <StatePanel title="꿈일기를 찾을 수 없어요" description="이미 삭제되었거나 잘못된 주소일 수 있어요." />;
  }

  const dream = dreamQuery.data;

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[36px]">
        <img src={resolveMediaUrl(dream.representative_image_url)} alt={dream.title} className="h-[460px] w-full object-cover md:h-[620px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(250,248,245,0.92)] via-[rgba(250,248,245,0.18)] to-transparent" />
      </section>

      <div className="mx-auto -mt-40 max-w-5xl px-2">
        <article className="glass-card p-8 md:p-12">
          <header className="mb-12">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="section-kicker">{formatDate(dream.dream_date)}</p>
                <h1 className="mt-4 font-display text-4xl leading-tight text-[var(--accent-strong)] md:text-6xl">{dream.title}</h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/dreams/${dream.id}/edit`} className="secondary-button">
                  수정
                </Link>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    if (window.confirm("이 꿈일기를 삭제할까요?")) {
                      deleteMutation.mutate();
                    }
                  }}
                >
                  삭제
                </button>
                <Link href={`/book-drafts?ids=${dream.id}`} className="primary-button">
                  책에 담기
                </Link>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {dream.tags.map((tag) => (
                <TagPill key={tag.id} tag={tag} />
              ))}
            </div>
          </header>

          <div className="space-y-8 text-lg leading-9 text-[var(--muted-strong)]">
            {dream.content.split("\n").filter(Boolean).map((paragraph, index) => (
              <p key={`${dream.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
