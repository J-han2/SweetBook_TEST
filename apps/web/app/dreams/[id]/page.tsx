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
    return <StatePanel title="꿈 상세를 불러오는 중" description="본문, 태그, 이미지와 메모를 하나의 장면으로 정리하고 있습니다." />;
  }

  if (dreamQuery.isError || !dreamQuery.data) {
    return <StatePanel title="기록을 찾을 수 없습니다" description="삭제된 꿈이거나 잘못된 주소일 수 있습니다." />;
  }

  const dream = dreamQuery.data;
  const showUploadedAside = dream.uploaded_image_url && dream.uploaded_image_url !== dream.representative_image_url;

  return (
    <div className="space-y-16">
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
                  Edit
                </Link>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    if (window.confirm("정말 이 꿈일기를 삭제할까요?")) {
                      deleteMutation.mutate();
                    }
                  }}
                >
                  Delete
                </button>
                <Link href={`/book-drafts/new?ids=${dream.id}`} className="primary-button">
                  Add to Book Draft
                </Link>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {dream.tags.map((tag) => (
                <TagPill key={tag.id} tag={tag} />
              ))}
            </div>
          </header>

          <div className="space-y-8">
            {dream.mood_summary ? (
              <p className="font-display text-2xl italic leading-10 text-[var(--muted-strong)]">“{dream.mood_summary}”</p>
            ) : null}

            <div className="space-y-8 text-lg leading-9 text-[var(--muted-strong)]">
              {dream.content.split("\n").filter(Boolean).map((paragraph, index) => (
                <p key={`${dream.id}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-r-[24px] border-l-4 border-[rgba(108,95,142,0.28)] bg-white/35 p-8">
            <p className="field-label">Personal Reflection</p>
            <p className="mt-3 font-display text-2xl italic leading-10 text-[var(--muted-strong)]">
              {dream.memo || "아직 메모가 남아 있지 않습니다. 이 꿈이 남긴 감정이나 현실의 연결점을 적어 두면 더 풍부한 기록이 됩니다."}
            </p>
          </div>
        </article>
      </div>

      <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {showUploadedAside ? (
          <div className="glass-card overflow-hidden">
            <img src={resolveMediaUrl(dream.uploaded_image_url, "")} alt="업로드 이미지" className="h-72 w-full object-cover" />
            <div className="p-6">
              <p className="section-kicker">Uploaded Image</p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">기록 작성 시 함께 남겨 둔 개인 업로드 이미지입니다.</p>
            </div>
          </div>
        ) : (
          <div className="glass-card p-8">
            <p className="section-kicker">Visual Note</p>
            <h2 className="mt-3 font-display text-3xl text-[var(--accent-strong)]">대표 이미지</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              업로드 이미지가 없으면 태그와 분위기 기반 플레이스홀더 대표 이미지가 연결됩니다.
            </p>
          </div>
        )}

        <div className="glass-card p-8">
          <p className="section-kicker">Archive Intent</p>
          <h2 className="mt-3 font-display text-3xl text-[var(--accent-strong)]">콘텐츠 감상이 중심입니다</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            이 상세 페이지는 꿈일기 자체를 다시 읽고 태그와 메모를 함께 감상하는 경험에 집중합니다. 책에 담기 액션은 그 뒤에 자연스럽게 이어지는 부가 기능으로만 배치했습니다.
          </p>
        </div>
      </section>
    </div>
  );
}
