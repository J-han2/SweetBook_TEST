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
  const initialSelectedTags = initialData?.tags.map((tag) => tag.name) ?? [];

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [dreamDate, setDreamDate] = useState(initialData?.dream_date ?? new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState(initialData?.content ?? "");
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [removeUploadedImage, setRemoveUploadedImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(resolveMediaUrl(initialData?.uploaded_image_url, ""));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tagEditorError, setTagEditorError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewTags, setPreviewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags);
  const [tagsTouched, setTagsTouched] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(removeUploadedImage ? null : resolveMediaUrl(initialData?.uploaded_image_url, ""));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, initialData?.uploaded_image_url, removeUploadedImage]);

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

  function goToCreateStepTwo() {
    if (!title.trim() || !content.trim()) {
      setErrorMessage("제목과 본문을 먼저 작성해 주세요.");
      return;
    }

    setErrorMessage(null);
    setCreateStep(2);
  }

  function addTag(rawValue: string) {
    const normalized = normalizeTagName(rawValue);
    if (!normalized) {
      setTagEditorError("태그 이름을 입력해 주세요.");
      return;
    }
    if (normalized.length > 50) {
      setTagEditorError("태그는 50자 이하로 입력해 주세요.");
      return;
    }
    if (selectedTags.includes(normalized)) {
      setTagEditorError("이미 선택한 태그예요.");
      setTagInput("");
      return;
    }
    if (selectedTags.length >= 12) {
      setTagEditorError("태그는 최대 12개까지 선택할 수 있어요.");
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

      if (mode === "edit" && removeUploadedImage) {
        formData.append("remove_uploaded_image", "true");
      }

      if (isCreateMode) {
        if (selectedTags.length > 0) {
          formData.append("manual_tags", JSON.stringify(selectedTags));
        }
      } else if (tagsTouched) {
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <label className="field-label">태그 선택</label>
            <p className="text-sm leading-6 text-[var(--muted)]">
              기존 태그를 검색하거나 직접 만들고, AI 추천 결과 중 원하는 것만 골라 붙일 수 있어요.
            </p>
          </div>
          <button
            type="button"
            className="secondary-button shrink-0"
            onClick={() => {
              setPreviewError(null);
              previewMutation.mutate();
            }}
            disabled={previewMutation.isPending || !content.trim()}
          >
            {previewMutation.isPending ? "추천 중..." : "AI 추천"}
          </button>
        </div>

        <div className="mt-4 flex gap-3">
          <input
            className="field-input flex-1"
            value={tagInput}
            onChange={(event) => {
              setTagInput(event.target.value);
              setTagEditorError(null);
            }}
            placeholder="태그를 검색하거나 직접 입력해보세요"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag(tagInput);
              }
            }}
          />
          <button type="button" className="secondary-button" onClick={() => addTag(tagInput)}>
            추가
          </button>
        </div>

        {tagEditorError ? <p className="mt-3 text-sm text-[#8f4854]">{tagEditorError}</p> : null}
        {previewError ? <p className="mt-3 text-sm text-[#8f4854]">{previewError}</p> : null}

        {previewMutation.isPending ? (
          <div className="mt-5 overflow-hidden rounded-[24px] border border-[rgba(122,97,146,0.12)] bg-[linear-gradient(135deg,rgba(232,222,253,0.6),rgba(255,255,255,0.82),rgba(245,215,223,0.56))] p-5 shadow-[0_18px_45px_rgba(114,91,125,0.08)]">
            <div className="flex items-center gap-4">
              <div className="ai-loader-orb" />
              <div className="min-w-0">
                <p className="font-display text-xl text-[var(--accent-strong)]">꿈의 결을 읽고 있어요</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  로컬 모델이 본문을 바탕으로 선택할 만한 태그를 추리고 있어요.
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

        <div className="mt-5 ai-suggestion-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="ai-badge">AI 추천</span>
              <p className="mt-3 font-display text-2xl text-[var(--accent-strong)]">추천 태그</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                현재 작성한 꿈을 바탕으로 추천한 태그입니다. 원하는 태그만 눌러 추가할 수 있어요.
              </p>
            </div>
            {!previewMutation.isPending && previewTags.length > 0 ? (
              <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--accent-strong)]">
                {previewTags.length}개 추천
              </span>
            ) : null}
          </div>

          {!previewMutation.isPending && previewTags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {aiSuggestedTags.length > 0 ? (
                aiSuggestedTags.map((tag) => (
                  <button key={tag} type="button" className="ai-suggestion-chip" onClick={() => addTag(tag)}>
                    #{tag}
                  </button>
                ))
              ) : (
                <span className="text-sm italic text-[var(--muted)]">추천된 태그는 모두 선택된 상태예요.</span>
              )}
            </div>
          ) : null}

          {!previewMutation.isPending && previewTags.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-dashed border-[rgba(108,95,142,0.16)] bg-white/55 px-4 py-5 text-sm leading-6 text-[var(--muted)]">
              본문을 먼저 작성한 뒤 AI 추천을 실행하면 여기에 태그 후보가 나타나요.
            </div>
          ) : null}
        </div>

        <div className="mt-5 pt-5 soft-divider">
          <p className="field-label !mb-2">직접 선택한 태그</p>
          <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
            기존 태그를 고르거나 새 태그를 만들어 이 꿈에 붙여둘 수 있어요.
          </p>
        </div>

        <div className="pt-1">
          <p className="field-label !mb-2">선택한 태그</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="rounded-full bg-[rgba(232,222,253,0.92)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)]"
                  onClick={() => removeTag(tag)}
                  title="태그 제거"
                >
                  #{tag} ×
                </button>
              ))
            ) : (
              <span className="text-sm italic text-[var(--muted)]">아직 선택한 태그가 없어요.</span>
            )}
          </div>
        </div>

        <div className="mt-5 pt-5 soft-divider">
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
                {tagsQuery.isLoading ? "태그 목록을 불러오는 중이에요..." : "일치하는 태그가 없어요. 새로 추가해보세요."}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderImagePanel() {
    return (
      <div className="glass-card overflow-hidden p-6">
        <label className="field-label">이미지 추가</label>
        <div className="relative mt-3 flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed border-[rgba(122,97,146,0.18)] bg-[rgba(255,255,255,0.35)] px-6 text-center">
          {previewUrl ? (
            <img src={previewUrl} alt="업로드 미리보기" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <p className="font-display text-2xl text-[var(--accent-strong)]">대표 이미지</p>
              <p className="mt-3 text-sm italic text-[var(--muted)]">
                이미지를 올리지 않으면 태그 분위기에 맞는 기본 대표 이미지가 사용돼요.
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
              if (nextFile) {
                setRemoveUploadedImage(false);
              }
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          <span>PNG, JPG, WEBP</span>
          {file ? (
            <>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-[var(--accent-strong)]">{file.name}</span>
              <button type="button" className="secondary-button px-4 py-2 text-xs" onClick={() => setFile(null)}>
                선택 해제
              </button>
            </>
          ) : null}
        </div>

        {!isCreateMode && initialData?.uploaded_image_url ? (
          <label className="mt-4 flex items-center gap-3 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={removeUploadedImage}
              onChange={(event) => {
                setRemoveUploadedImage(event.target.checked);
                if (event.target.checked) {
                  setFile(null);
                }
              }}
            />
            현재 업로드 이미지를 삭제할게요
          </label>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="section-kicker">{isCreateMode ? `New Journey · Step ${createStep} of 2` : "Edit Dream"}</p>
        <h1 className="page-title mt-4">
          {isCreateMode ? (createStep === 1 ? "Capture the Intangible" : "Curate the Details") : "A Dream, Rewritten"}
        </h1>
        <p className="page-copy mx-auto mt-6 max-w-2xl italic">
          {isCreateMode && createStep === 1
            ? "날짜와 제목, 본문을 먼저 적은 뒤 다음 단계에서 태그와 이미지를 추가할 수 있어요."
            : "AI 추천 태그는 선택형으로 보여주고, 직접 만든 태그도 함께 저장할 수 있어요."}
        </p>

        {isCreateMode ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.2em] ${
                createStep === 1 ? "bg-[rgba(108,95,142,0.16)] text-[var(--accent-strong)]" : "bg-white/70 text-[var(--muted)]"
              }`}
            >
              1. 작성
            </span>
            <span className="h-px w-10 bg-[rgba(122,97,146,0.16)]" />
            <span
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.2em] ${
                createStep === 2 ? "bg-[rgba(108,95,142,0.16)] text-[var(--accent-strong)]" : "bg-white/70 text-[var(--muted)]"
              }`}
            >
              2. 정리
            </span>
          </div>
        ) : null}
      </section>

      <form
        className="grid gap-10 md:grid-cols-12"
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);

          if (isCreateMode && createStep === 1) {
            goToCreateStepTwo();
            return;
          }

          mutation.mutate();
        }}
      >
        {!isCreateMode || createStep === 1 ? (
          <section className="space-y-8 md:col-span-8 md:col-start-3">
            <div className="glass-card p-8">
              <div className="space-y-6">
                <div>
                  <label className="field-label">제목</label>
                  <input
                    className="w-full border-b border-[rgba(122,97,146,0.14)] bg-transparent py-4 font-display text-3xl text-[var(--accent-strong)] outline-none placeholder:text-[rgba(108,95,142,0.22)]"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="복도, 그림자, 파도..."
                  />
                </div>

                <div className="max-w-sm">
                  <label className="field-label">꿈을 꾼 날짜</label>
                  <CalendarField value={dreamDate} onChange={setDreamDate} placeholder="날짜를 골라주세요" />
                </div>
              </div>
            </div>

            <div className="glass-card flex min-h-[620px] flex-col p-8">
              <label className="field-label">꿈 내용</label>
              <textarea
                className="mt-2 min-h-[420px] w-full flex-1 resize-none border-none bg-transparent font-display text-[23px] leading-[1.9] text-[var(--text)] outline-none placeholder:text-[rgba(120,109,130,0.4)]"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="사라지기 전에 꿈을 적어보세요. 장면, 소리, 속도감, 두려움, 안도감까지 그대로 남겨도 좋아요."
              />
            </div>

            {errorMessage ? <div className="rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{errorMessage}</div> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link href={isCreateMode ? "/dreams" : `/dreams/${initialData?.id}`} className="secondary-button px-6 py-4">
                {isCreateMode ? "작성 취소" : "상세로 돌아가기"}
              </Link>
              <button className="primary-button px-6 py-4" type="submit" disabled={mutation.isPending}>
                {isCreateMode ? "다음 단계로" : mutation.isPending ? "저장 중..." : "수정 저장"}
              </button>
            </div>
          </section>
        ) : null}

        {!isCreateMode || createStep === 2 ? (
          <>
            <section className="space-y-8 md:col-span-8">
              {isCreateMode ? (
                <div className="glass-card p-6">
                  <p className="field-label">작성한 내용</p>
                  <h2 className="font-display text-3xl text-[var(--accent-strong)]">{title || "제목 없는 꿈"}</h2>
                  <p className="mt-3 text-sm italic text-[var(--muted)]">{dreamDate}</p>
                  <p className="mt-5 line-clamp-5 text-sm leading-7 text-[var(--muted-strong)]">{content}</p>
                </div>
              ) : (
                <>
                  <div className="glass-card p-8">
                    <div className="space-y-6">
                      <div>
                        <label className="field-label">제목</label>
                        <input
                          className="w-full border-b border-[rgba(122,97,146,0.14)] bg-transparent py-4 font-display text-3xl text-[var(--accent-strong)] outline-none placeholder:text-[rgba(108,95,142,0.22)]"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          placeholder="복도, 그림자, 파도..."
                        />
                      </div>

                      <div className="max-w-sm">
                        <label className="field-label">꿈을 꾼 날짜</label>
                        <CalendarField value={dreamDate} onChange={setDreamDate} placeholder="날짜를 골라주세요" />
                      </div>
                    </div>
                  </div>

                  <div className="glass-card flex min-h-[620px] flex-col p-8">
                    <label className="field-label">꿈 내용</label>
                    <textarea
                      className="mt-2 min-h-[420px] w-full flex-1 resize-none border-none bg-transparent font-display text-[23px] leading-[1.9] text-[var(--text)] outline-none placeholder:text-[rgba(120,109,130,0.4)]"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="사라지기 전에 꿈을 적어보세요. 장면, 소리, 속도감, 두려움, 안도감까지 그대로 남겨도 좋아요."
                    />
                  </div>
                </>
              )}

              {renderTagEditor()}
            </section>

            <aside className="space-y-8 md:col-span-4">
              {renderImagePanel()}

              {errorMessage ? <div className="rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{errorMessage}</div> : null}

              <div className="flex flex-col gap-3">
                {isCreateMode ? (
                  <button type="button" className="secondary-button w-full py-4" onClick={() => setCreateStep(1)}>
                    이전 단계로
                  </button>
                ) : (
                  <Link href={`/dreams/${initialData?.id}`} className="secondary-button w-full py-4">
                    상세로 돌아가기
                  </Link>
                )}

                <button className="primary-button w-full py-4" type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "저장 중..." : isCreateMode ? "아카이브에 저장" : "수정 저장"}
                </button>

                {isCreateMode ? (
                  <Link href="/dreams" className="secondary-button w-full py-4">
                    작성 취소
                  </Link>
                ) : null}
              </div>
            </aside>
          </>
        ) : null}
      </form>
    </div>
  );
}
