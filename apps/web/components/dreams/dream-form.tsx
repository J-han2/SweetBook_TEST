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
  const initialSelectedTags = initialData?.tags.map((tag) => tag.name) ?? [];

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [dreamDate, setDreamDate] = useState(initialData?.dream_date ?? new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState(initialData?.content ?? "");
  const [memo, setMemo] = useState(initialData?.memo ?? "");
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
      setTagEditorError("이미 선택된 태그입니다.");
      setTagInput("");
      return;
    }
    if (selectedTags.length >= 12) {
      setTagEditorError("태그는 최대 12개까지 선택할 수 있습니다.");
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
      formData.append("memo", memo);

      if (file) {
        formData.append("uploaded_image", file);
      }

      if (mode === "edit" && removeUploadedImage) {
        formData.append("remove_uploaded_image", "true");
      }

      if (mode === "create") {
        if (selectedTags.length > 0) {
          formData.append("manual_tags", JSON.stringify(selectedTags));
        }
      } else if (tagsTouched) {
        formData.append("manual_tags", JSON.stringify(selectedTags));
      }

      return mode === "create" ? api.createDreamEntry(formData) : api.updateDreamEntry(initialData!.id, formData);
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
    mutationFn: () => api.previewTags(content, mode === "create" || tagsTouched ? selectedTags : []),
    onSuccess: (result) => {
      setPreviewError(null);
      setPreviewTags(result.tags);
    },
    onError: (error: Error) => {
      setPreviewTags([]);
      setPreviewError(error.message);
    },
  });

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="section-kicker">{mode === "create" ? "New Journey" : "Refine a Memory"}</p>
        <h1 className="page-title mt-4">{mode === "create" ? "Capture the Intangible" : "A Dream, Rewritten"}</h1>
        <p className="page-copy mx-auto mt-6 max-w-2xl italic">
          DreamArchive keeps the writing flow first. AI tag suggestions are shown as selectable recommendations, and you
          can still pin your own tags directly.
        </p>
      </section>

      <form
        className="grid gap-10 md:grid-cols-12"
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);
          mutation.mutate();
        }}
      >
        <section className="space-y-8 md:col-span-8">
          <div className="glass-card p-8">
            <div className="space-y-6">
              <div>
                <label className="field-label">Dream Identity</label>
                <input
                  className="w-full border-b border-[rgba(122,97,146,0.14)] bg-transparent py-4 font-display text-3xl text-[var(--accent-strong)] outline-none placeholder:text-[rgba(108,95,142,0.22)]"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="A corridor, a shadow, a tide..."
                />
              </div>

              <div className="max-w-sm">
                <label className="field-label">Waking Date</label>
                <CalendarField value={dreamDate} onChange={setDreamDate} placeholder="꿈을 꾼 날짜를 고르세요" />
              </div>
            </div>
          </div>

          <div className="glass-card flex min-h-[620px] flex-col p-8">
            <label className="field-label">The Dream Stream</label>
            <textarea
              className="mt-2 min-h-[420px] w-full flex-1 resize-none border-none bg-transparent font-display text-[23px] leading-[1.9] text-[var(--text)] outline-none placeholder:text-[rgba(120,109,130,0.4)]"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write the dream before it fades. Scenes, sounds, bodies, pace, fear, relief."
            />
          </div>

          <div className="glass-card p-6">
            <label className="field-label">Notes &amp; Memos</label>
            <textarea
              className="field-input min-h-[220px] resize-none bg-[rgba(255,255,255,0.46)] italic"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="Emotions after waking, recurring real-world associations, personal reading."
            />
            <p className="mt-3 text-xs italic text-[var(--muted)]">Memos stay visible on the dream detail page.</p>
          </div>
        </section>

        <aside className="space-y-8 md:col-span-4">
          <div className="glass-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="field-label">Pinned Tags</label>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Search the catalog, create a new tag, or pull AI recommendations and select only the ones you want.
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
                placeholder="태그를 검색하거나 직접 추가"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag(tagInput);
                  }
                }}
              />
              <button type="button" className="secondary-button" onClick={() => addTag(tagInput)}>
                Add
              </button>
            </div>

            {tagEditorError ? <p className="mt-3 text-sm text-[#8f4854]">{tagEditorError}</p> : null}
            {previewError ? <p className="mt-3 text-sm text-[#8f4854]">{previewError}</p> : null}

            {previewMutation.isPending ? (
              <div className="mt-5 overflow-hidden rounded-[24px] border border-[rgba(122,97,146,0.12)] bg-[linear-gradient(135deg,rgba(232,222,253,0.6),rgba(255,255,255,0.82),rgba(245,215,223,0.56))] p-5 shadow-[0_18px_45px_rgba(114,91,125,0.08)]">
                <div className="flex items-center gap-4">
                  <div className="ai-loader-orb" />
                  <div className="min-w-0">
                    <p className="font-display text-xl text-[var(--accent-strong)]">Reading the dream texture</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      The local model is narrowing the tag set into a few selectable suggestions.
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
                  <span className="ai-badge">AI Curated</span>
                  <p className="mt-3 font-display text-2xl text-[var(--accent-strong)]">Recommended Tags</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    The local model reads the current dream and surfaces a small set of selectable tags. Only the tags
                    you click are added.
                  </p>
                </div>
                {!previewMutation.isPending && previewTags.length > 0 ? (
                  <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    {previewTags.length} picks
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
                    <span className="text-sm italic text-[var(--muted)]">
                      All recommended tags are already selected for this entry.
                    </span>
                  )}
                </div>
              ) : null}

              {!previewMutation.isPending && previewTags.length === 0 ? (
                <div className="mt-5 rounded-[20px] border border-dashed border-[rgba(108,95,142,0.16)] bg-white/55 px-4 py-5 text-sm leading-6 text-[var(--muted)]">
                  Write the dream first, then run AI suggestions to get a focused set of tag candidates here.
                </div>
              ) : null}
            </div>

            <div className="mt-5 pt-5 soft-divider">
              <p className="field-label !mb-2">Your Tag Shelf</p>
              <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
                Search existing tags, create your own, and keep only the tags that should stay attached to this dream.
              </p>
            </div>

            <div className="pt-1">
              <p className="field-label !mb-2">Selected Tags</p>
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
                  <span className="text-sm italic text-[var(--muted)]">No pinned tags yet.</span>
                )}
              </div>
            </div>

            <div className="mt-5 pt-5 soft-divider">
              <p className="field-label !mb-2">Catalog Suggestions</p>
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
                    {tagsQuery.isLoading ? "Loading tag catalog..." : "No matching tags. Add the tag to create it."}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden p-6">
            <label className="field-label">Anchor a Visual Memory</label>
            <div className="relative mt-3 flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed border-[rgba(122,97,146,0.18)] bg-[rgba(255,255,255,0.35)] px-6 text-center">
              {previewUrl ? (
                <img src={previewUrl} alt="Upload preview" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <p className="font-display text-2xl text-[var(--accent-strong)]">Image Fragment</p>
                  <p className="mt-3 text-sm italic text-[var(--muted)]">
                    If you skip upload, the archive falls back to a local placeholder image chosen from the tag mood.
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
                    Clear
                  </button>
                </>
              ) : null}
            </div>

            {mode === "edit" && initialData?.uploaded_image_url ? (
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
                Remove the current uploaded image
              </label>
            ) : null}
          </div>

          {errorMessage ? <div className="rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{errorMessage}</div> : null}

          <div className="flex flex-col gap-3">
            <button className="primary-button w-full py-4" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : mode === "create" ? "Save to Archive" : "Update Entry"}
            </button>
            <Link href={mode === "create" ? "/dreams" : `/dreams/${initialData?.id}`} className="secondary-button w-full py-4">
              {mode === "create" ? "Discard Entry" : "Back to Dream"}
            </Link>
          </div>
        </aside>
      </form>
    </div>
  );
}
