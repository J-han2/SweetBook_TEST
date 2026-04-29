"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CalendarField } from "@/components/ui/calendar-field";
import { api } from "@/lib/api";
import { DreamEntryDetail } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/utils";

function normalizeTagName(value: string) {
  return value.replace(/#/g, " ").replace(/\s+/g, " ").trim();
}

const STEP_TRACK_DURATION_MS = 460;
const STEP_TRACK_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export function DreamForm({
  mode,
  initialData,
}: {
  mode: "create" | "edit";
  initialData?: DreamEntryDetail;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isCreateMode = mode === "create";
  const cancelHref = isCreateMode ? "/dreams" : `/dreams/${initialData?.id}`;
  const cancelLabel = isCreateMode ? "작성 취소" : "상세로 돌아가기";
  const initialSelectedTags = initialData?.tags.map((tag) => tag.name) ?? [];

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [dreamDate, setDreamDate] = useState(initialData?.dream_date ?? new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState(initialData?.content ?? "");
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(resolveMediaUrl(initialData?.image_url, ""));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tagEditorError, setTagEditorError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewTags, setPreviewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags);
  const [tagsTouched, setTagsTouched] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(resolveMediaUrl(initialData?.image_url, ""));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, initialData?.image_url]);

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: api.listTags,
  });

  const filteredSuggestions = useMemo(() => {
    const keyword = normalizeTagName(tagInput).toLowerCase();
    return (tagsQuery.data ?? [])
      .filter((tag) => !selectedTags.includes(tag.name))
      .filter((tag) => (keyword ? tag.name.toLowerCase().includes(keyword) : true))
      .slice(0, 8);
  }, [selectedTags, tagInput, tagsQuery.data]);

  const aiSuggestedTags = useMemo(
    () => previewTags.filter((tag) => !selectedTags.includes(tag)),
    [previewTags, selectedTags],
  );

  const createPageTitle = formStep === 1 ? "Write the dream" : "Shape the dream";
  const createPageCopy =
    formStep === 1
      ? "지난 밤의 꿈을 기록으로 남기세요"
      : "이미지와 태그로 꿈을 정리하세요";
  const submitButtonLabel = isCreateMode ? "아카이브에 저장" : "수정 저장";

  function goToStep(nextStep: 1 | 2) {
    if (nextStep === formStep) {
      return;
    }
    setFormStep(nextStep);
  }

  function goToDetailsStep() {
    if (!title.trim() || !content.trim()) {
      setErrorMessage("\uc81c\ubaa9\uacfc \ubcf8\ubb38\uc744 \uba3c\uc800 \uc791\uc131\ud574\uc8fc\uc138\uc694.");
      return;
    }

    setErrorMessage(null);
    goToStep(2);
  }

  function addTag(rawValue: string) {
    const normalized = normalizeTagName(rawValue);

    if (!normalized) {
      setTagEditorError("\ud0dc\uadf8 \uc774\ub984\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694.");
      return;
    }

    if (normalized.length > 50) {
      setTagEditorError("\ud0dc\uadf8\ub294 50\uc790 \uc774\ud558\ub85c \uc785\ub825\ud574\uc8fc\uc138\uc694.");
      return;
    }

    if (selectedTags.includes(normalized)) {
      setTagEditorError("\uc774\ubbf8 \uc120\ud0dd\ud55c \ud0dc\uadf8\uc608\uc694.");
      setTagInput("");
      return;
    }

    if (selectedTags.length >= 12) {
      setTagEditorError("\ud0dc\uadf8\ub294 \ucd5c\ub300 12\uac1c\uae4c\uc9c0 \uc120\ud0dd\ud560 \uc218 \uc788\uc5b4\uc694.");
      return;
    }

    setSelectedTags((current) => [...current, normalized]);
    setTagInput("");
    setTagEditorError(null);
    setTagsTouched(true);
  }

  function removeTag(name: string) {
    setSelectedTags((current) => current.filter((item) => item !== name));
    setTagEditorError(null);
    setTagsTouched(true);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("dream_date", dreamDate);
      formData.append("content", content);

      if (file) {
        formData.append("uploaded_image", file);
      }

      const shouldSendManualTags = isCreateMode ? selectedTags.length > 0 : tagsTouched;
      if (shouldSendManualTags) {
        formData.append("manual_tags", JSON.stringify(selectedTags));
      }

      return isCreateMode ? api.createDreamEntry(formData) : api.updateDreamEntry(initialData!.id, formData);
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["dreams"] });
      await queryClient.invalidateQueries({ queryKey: ["dream", data.id] });
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      router.push(`/dreams/${data.id}`);
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const previewMutation = useMutation({
    mutationFn: () => api.previewTags(content, isCreateMode || tagsTouched ? selectedTags : []),
    onSuccess: (result) => {
      setPreviewError(null);
      setPreviewTags(result.tags);
    },
    onError: (error: Error) => {
      setPreviewTags([]);
      setPreviewError(error.message);
    },
  });

  function renderTagEditor() {
    return (
      <div className="glass-card p-6">
        <div>
          <p className="field-label !mb-2">선택된 태그</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="rounded-full bg-[rgba(232,222,253,0.92)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)]"
                  onClick={() => removeTag(tag)}
                  title="Remove tag"
                >
                  #{tag} ×
                </button>
              ))
            ) : (
              <span className="mt-1.5 inline-block text-sm italic text-[var(--muted)]">
                아직 선택된 태그가 없어요.
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 pt-5 soft-divider">
          <p className="field-label !mb-2">태그 검색/추가</p>
          <div className="mt-3 flex gap-3">
            <input
              className="field-input flex-1"
              value={tagInput}
              onChange={(event) => {
                setTagInput(event.target.value);
                setTagEditorError(null);
              }}
              placeholder="태그를 검색하거나 직접 입력하세요"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag(tagInput);
                }
              }}
            />
            <button
              type="button"
              className="secondary-button shrink-0 whitespace-nowrap px-5"
              onClick={() => addTag(tagInput)}
            >
              새로운 태그 추가
            </button>
          </div>

          {tagEditorError ? <p className="mt-3 text-sm text-[#8f4854]">{tagEditorError}</p> : null}

          <div className="mt-5">
            <p className="field-label !mb-2">태그 목록</p>
            <div className="flex flex-wrap gap-2">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="rounded-full border border-[rgba(122,97,146,0.16)] bg-white/65 px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)]"
                    onClick={() => addTag(tag.name)}
                  >
                    #{tag.name}
                  </button>
                ))
              ) : (
                  <span className="text-sm italic text-[var(--muted)]">
                    {tagsQuery.isLoading ? "태그를 불러오는 중..." : "일치하는 태그가 없어요. 위에서 새 태그를 추가해보세요."}
                  </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 pt-5 soft-divider">
          <div className="ai-suggestion-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-2xl text-[var(--accent-strong)]">AI 추천 태그</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  AI 모델이 꿈의 내용을 바탕으로 적절한 태그를 추천합니다.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {!previewMutation.isPending && previewTags.length > 0 ? (
                  <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--accent-strong)]">
                    {previewTags.length} TAGS
                  </span>
                ) : null}
                <button
                  type="button"
                  className="secondary-button shrink-0"
                  onClick={() => {
                    setPreviewError(null);
                    previewMutation.mutate();
                  }}
                  disabled={previewMutation.isPending || !content.trim()}
                >
                  {previewMutation.isPending ? "분석 중..." : "AI 추천 받기"}
                </button>
              </div>
            </div>

            {previewError ? <p className="mt-3 text-sm text-[#8f4854]">{previewError}</p> : null}

            {previewMutation.isPending ? (
              <div className="mt-5 overflow-hidden rounded-[24px] border border-[rgba(122,97,146,0.1)] bg-[linear-gradient(145deg,rgba(236,228,251,0.48),rgba(255,255,255,0.86)_38%,rgba(248,238,242,0.42)_100%)] p-5">
                <div className="flex items-center gap-4">
                  <div className="ai-loader-orb" />
                  <div className="min-w-0">
                    <p className="font-display text-xl text-[var(--accent-strong)]">
                      {"\uafc8\uc758 \ubd84\uc704\uae30\ub97c \uc77d\uace0 \uc788\uc5b4\uc694"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {"\uafc8\uc758 \ub0b4\uc6a9\uc744 \ubc14\ud0d5\uc73c\ub85c \uc5b4\uc6b8\ub9ac\ub294 \ud0dc\uadf8\ub97c \uace0\ub974\uace0 \uc788\uc5b4\uc694."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <span key={index} className="ai-loader-chip" />
                  ))}
                </div>
              </div>
            ) : null}

            {!previewMutation.isPending && previewTags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {aiSuggestedTags.length > 0 ? (
                  aiSuggestedTags.map((tag) => (
                    <button key={tag} type="button" className="ai-suggestion-chip" onClick={() => addTag(tag)}>
                      #{tag}
                    </button>
                  ))
                ) : (
                  <span className="text-sm italic text-[var(--muted)]">
                    추천 태그를 모두 선택했어요. 원하는 태그가 보이지 않는다면 직접 추가해보세요!
                  </span>
                )}
              </div>
            ) : null}

            {!previewMutation.isPending && !previewError && previewTags.length === 0 ? (
              <div className="mt-5 rounded-[20px] border border-dashed border-[rgba(108,95,142,0.16)] bg-white/55 px-4 py-5 text-sm leading-6 text-[var(--muted)]">
                {previewMutation.isSuccess
                  ? "추천할 태그를 찾지 못했어요. 원하는 태그가 있다면 직접 추가해보세요!"
                  : "AI 추천 결과가 이곳에 표시됩니다."}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  function renderImagePanel() {
    return (
      <div className="glass-card overflow-hidden p-6">
        <label className="field-label">Image</label>
        <div className="relative mt-3 flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed border-[rgba(122,97,146,0.18)] bg-[rgba(255,255,255,0.35)] px-6 text-center">
          {previewUrl ? (
            <img src={previewUrl} alt="Uploaded preview" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <p className="font-display text-[1.32rem] text-[var(--accent-strong)]">꿈 속 풍경은 어떤 모습이었나요?</p>
              <p className="mt-3 text-sm italic text-[var(--muted)]">
                이미지를 추가해주세요
              </p>
            </>
          )}
          <input
            className="absolute inset-0 cursor-pointer opacity-0"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          <span>PNG, JPG, WEBP</span>
          {file ? (
            <>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-[var(--accent-strong)]">{file.name}</span>
              <button type="button" className="secondary-button px-4 py-2 text-xs" onClick={() => setFile(null)}>
                {"\uc120\ud0dd \ud574\uc81c"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {isCreateMode ? (
        <section className="text-center">
          <h1 className="page-title mt-4">{createPageTitle}</h1>
          <p className="page-copy mx-auto mt-6 max-w-2xl italic">{createPageCopy}</p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.2em] ${
                formStep === 1 ? "bg-[rgba(108,95,142,0.16)] text-[var(--accent-strong)]" : "bg-white/70 text-[var(--muted)]"
              }`}
            >
              {"1. \uae30\ub85d"}
            </span>
            <span className="h-px w-10 bg-[rgba(122,97,146,0.16)]" />
            <span
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.2em] ${
                formStep === 2 ? "bg-[rgba(108,95,142,0.16)] text-[var(--accent-strong)]" : "bg-white/70 text-[var(--muted)]"
              }`}
            >
              {"2. \uc815\ub9ac"}
            </span>
          </div>
        </section>
      ) : null}

      <form
        className="space-y-10"
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);

          if (formStep === 1) {
            goToDetailsStep();
            return;
          }

          mutation.mutate();
        }}
      >
        <div className="overflow-hidden">
          <div
            className="flex w-[200%] will-change-transform"
            style={{
              transform: formStep === 1 ? "translateX(0%)" : "translateX(-50%)",
              transitionDuration: `${STEP_TRACK_DURATION_MS}ms`,
              transitionTimingFunction: STEP_TRACK_EASING,
            }}
          >
            <section className="w-1/2 shrink-0 pr-0 md:pr-6">
              <div className="mx-auto max-w-5xl space-y-8">
                <div className="glass-card p-8">
                  <div className="space-y-6">
                    <div>
                      <label className="field-label">Title</label>
                      <input
                        className="w-full border-b border-[rgba(122,97,146,0.14)] bg-transparent py-4 font-display text-3xl text-[var(--accent-strong)] outline-none placeholder:text-[rgba(108,95,142,0.22)]"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="복도, 바다, 파란 방..."
                      />
                    </div>

                    <div className="max-w-sm">
                      <label className="field-label">Date</label>
                      <CalendarField value={dreamDate} onChange={setDreamDate} placeholder="날짜를 선택하세요" />
                    </div>
                  </div>
                </div>

                <div className="glass-card flex min-h-[620px] flex-col p-8">
                  <label className="field-label">The Dream Stream</label>
                  <textarea
                    className="mt-2 min-h-[420px] w-full flex-1 resize-none border-none bg-transparent font-display text-[23px] leading-[1.9] text-[var(--text)] outline-none placeholder:text-[rgba(120,109,130,0.4)]"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="장면, 소리, 색감, 깨어났을 때의 감정까지 모두 남길 수 있어요."
                  />
                </div>

                {errorMessage && formStep === 1 ? (
                  <div className="rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{errorMessage}</div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Link href={cancelHref} className="secondary-button px-6 py-4">{cancelLabel}</Link>
                  <button className="primary-button px-6 py-4" type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "\uc800\uc7a5 \uc911..." : "\ub2e4\uc74c \ub2e8\uacc4\ub85c"}
                  </button>
                </div>
              </div>
            </section>

            <section className="w-1/2 shrink-0 pl-0 md:pl-6">
              <div className="grid gap-10 md:grid-cols-12">
                <section className="space-y-8 md:col-span-8">
                  <div className="glass-card p-6">
                    <p className="field-label">Title</p>
                    <h2 className="font-display text-3xl text-[var(--accent-strong)]">{title || "Untitled Dream"}</h2>
                    <p className="mt-3 text-sm italic text-[var(--muted)]">{dreamDate}</p>
                    <p className="mt-5 line-clamp-5 text-sm leading-7 text-[var(--muted-strong)]">{content}</p>
                  </div>

                  {renderTagEditor()}
                </section>

                <aside className="space-y-8 md:col-span-4">
                  {renderImagePanel()}

                  {errorMessage && formStep === 2 ? (
                    <div className="rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{errorMessage}</div>
                  ) : null}

                  <div className="flex flex-col gap-3">
                    <button type="button" className="secondary-button w-full py-4" onClick={() => goToStep(1)}>
                      {"\uc774\uc804 \ub2e8\uacc4\ub85c"}
                    </button>

                    <button className="primary-button w-full py-4" type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? "\uc800\uc7a5 \uc911..." : submitButtonLabel}
                    </button>

                    <Link href={cancelHref} className="secondary-button w-full py-4">{cancelLabel}</Link>
                  </div>
                </aside>
              </div>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
