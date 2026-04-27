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
  const [formStep, setFormStep] = useState<1 | 2>(1);
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

  function goToDetailsStep() {
    if (!title.trim() || !content.trim()) {
      setErrorMessage("\uc81c\ubaa9\uacfc \ubcf8\ubb38\uc744 \uba3c\uc800 \uc791\uc131\ud574\uc8fc\uc138\uc694.");
      return;
    }

    setErrorMessage(null);
    setFormStep(2);
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

      if (!isCreateMode && removeUploadedImage) {
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

  const stepLabel = isCreateMode ? "New Journey" : "Edit Dream";
  const pageTitle =
    formStep === 1 ? (isCreateMode ? "Capture the Intangible" : "Rewrite the Dream") : "Curate the Details";
  const pageCopy =
    formStep === 1
      ? "Write the date, title, and dream first, then continue to tags and image."
      : "Refine the archive with tags and a single representative image.";

  function renderTagEditor() {
    return (
      <div className="glass-card p-6">
        <div>
          <label className="field-label">{"\ud0dc\uadf8 \uc120\ud0dd"}</label>
          <p className="text-sm leading-6 text-[var(--muted)]">
            {
              "\uc774\ubbf8 \uc120\ud0dd\ud55c \ud0dc\uadf8\ub97c \uba3c\uc800 \ud655\uc778\ud558\uace0, \uc0c8 \ud0dc\uadf8\ub97c \uac80\uc0c9\ud558\uac70\ub098 \ucd94\uac00\ud55c \ub4a4 \uc544\ub798\uc758 AI \ucd94\ucc9c\uc744 \uac80\ud1a0\ud574\ubcf4\uc138\uc694."
            }
          </p>
        </div>

        <div className="mt-5">
          <p className="field-label !mb-2">{"\uc120\ud0dd\ub41c \ud0dc\uadf8"}</p>
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
              <span className="text-sm italic text-[var(--muted)]">
                {"\uc544\uc9c1 \uc120\ud0dd\ub41c \ud0dc\uadf8\uac00 \uc5c6\uc5b4\uc694."}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 pt-5 soft-divider">
          <p className="field-label !mb-2">{"\ud0dc\uadf8 \uac80\uc0c9/\ucd94\uac00"}</p>
          <div className="mt-3 flex gap-3">
            <input
              className="field-input flex-1"
              value={tagInput}
              onChange={(event) => {
                setTagInput(event.target.value);
                setTagEditorError(null);
              }}
              placeholder={"\ud0dc\uadf8\ub97c \uac80\uc0c9\ud558\uac70\ub098 \uc9c1\uc811 \uc785\ub825\ud558\uc138\uc694"}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag(tagInput);
                }
              }}
            />
            <button type="button" className="secondary-button" onClick={() => addTag(tagInput)}>
              {"\ucd94\uac00"}
            </button>
          </div>

          {tagEditorError ? <p className="mt-3 text-sm text-[#8f4854]">{tagEditorError}</p> : null}

          <div className="mt-5">
            <p className="field-label !mb-2">{"\ud0dc\uadf8 \ubaa9\ub85d"}</p>
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
                  {tagsQuery.isLoading
                    ? "\ud0dc\uadf8\ub97c \ubd88\ub7ec\uc624\ub294 \uc911..."
                    : "\uc77c\uce58\ud558\ub294 \ud0dc\uadf8\uac00 \uc5c6\uc5b4\uc694. \uc704\uc5d0\uc11c \uc0c8 \ud0dc\uadf8\ub97c \ucd94\uac00\ud574\ubcf4\uc138\uc694."}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 pt-5 soft-divider">
          <div className="ai-suggestion-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="ai-badge">{"AI \ucd94\ucc9c"}</span>
                <p className="mt-3 font-display text-2xl text-[var(--accent-strong)]">
                  {"\ucd94\ucc9c \ud0dc\uadf8"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {
                    "\ub85c\uceec \ubaa8\ub378\ub85c \ud0dc\uadf8\ub97c \ucd94\ucc9c\ud55c \ub4a4, \uc774 \uafc8\uc5d0 \ub9de\ub294 \uac83\ub9cc \uc120\ud0dd\ud574\ubcf4\uc138\uc694."
                  }
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
                  {previewMutation.isPending ? "\ubd84\uc11d \uc911..." : "AI \uc2e4\ud589"}
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
                      {
                        "\ub85c\uceec \ubaa8\ub378\uc774 \ubcf8\ubb38\uc744 \ubc14\ud0d5\uc73c\ub85c \uc5b4\uc6b8\ub9ac\ub294 \ud0dc\uadf8\ub97c \uace0\ub974\uace0 \uc788\uc5b4\uc694."
                      }
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
                    {"\ucd94\ucc9c\ub41c \ud0dc\uadf8\ub97c \ubaa8\ub450 \uc774\ubbf8 \uc120\ud0dd\ud588\uc5b4\uc694."}
                  </span>
                )}
              </div>
            ) : null}

            {!previewMutation.isPending && previewTags.length === 0 ? (
              <div className="mt-5 rounded-[20px] border border-dashed border-[rgba(108,95,142,0.16)] bg-white/55 px-4 py-5 text-sm leading-6 text-[var(--muted)]">
                {
                  "\uba3c\uc800 \uafc8 \ub0b4\uc6a9\uc744 \uc791\uc131\ud55c \ub4a4 AI \ucd94\ucc9c\uc744 \uc2e4\ud589\ud558\uba74 \uc5ec\uae30\uc5d0 \uacb0\uacfc\uac00 \ubcf4\uc5ec\uc694."
                }
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
              <p className="font-display text-2xl text-[var(--accent-strong)]">One image for this dream</p>
              <p className="mt-3 text-sm italic text-[var(--muted)]">
                If you skip the upload, the service will use a representative image that matches the mood and tags.
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
                {"\uc120\ud0dd \ud574\uc81c"}
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
            {"\ud604\uc7ac \uc5c5\ub85c\ub4dc\ub41c \uc774\ubbf8\uc9c0\ub97c \uc81c\uac70\ud560\uac8c\uc694"}
          </label>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="section-kicker">{`${stepLabel} · Step ${formStep} of 2`}</p>
        <h1 className="page-title mt-4">{pageTitle}</h1>
        <p className="page-copy mx-auto mt-6 max-w-2xl italic">{pageCopy}</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <span
            className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.2em] ${
              formStep === 1 ? "bg-[rgba(108,95,142,0.16)] text-[var(--accent-strong)]" : "bg-white/70 text-[var(--muted)]"
            }`}
          >
            {"1. \uc791\uc131"}
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

      <form
        className="grid gap-10 md:grid-cols-12"
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
        {formStep === 1 ? (
          <section className="space-y-8 md:col-span-8 md:col-start-3">
            <div className="glass-card p-8">
              <div className="space-y-6">
                <div>
                  <label className="field-label">Title</label>
                  <input
                    className="w-full border-b border-[rgba(122,97,146,0.14)] bg-transparent py-4 font-display text-3xl text-[var(--accent-strong)] outline-none placeholder:text-[rgba(108,95,142,0.22)]"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="A hallway, a sea, a blue room..."
                  />
                </div>

                <div className="max-w-sm">
                  <label className="field-label">Dream Date</label>
                  <CalendarField value={dreamDate} onChange={setDreamDate} placeholder="Select a date" />
                </div>
              </div>
            </div>

            <div className="glass-card flex min-h-[620px] flex-col p-8">
              <label className="field-label">The Dream Stream</label>
              <textarea
                className="mt-2 min-h-[420px] w-full flex-1 resize-none border-none bg-transparent font-display text-[23px] leading-[1.9] text-[var(--text)] outline-none placeholder:text-[rgba(120,109,130,0.4)]"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write the dream before it fades. Scenes, sounds, colors, and the feeling you woke up with are all worth keeping."
              />
            </div>

            {errorMessage ? <div className="rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{errorMessage}</div> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link href={isCreateMode ? "/dreams" : `/dreams/${initialData?.id}`} className="secondary-button px-6 py-4">
                {isCreateMode ? "\uc791\uc131 \ucde8\uc18c" : "\uc0c1\uc138\ub85c \ub3cc\uc544\uac00\uae30"}
              </Link>
              <button className="primary-button px-6 py-4" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "\uc800\uc7a5 \uc911..." : "\ub2e4\uc74c \ub2e8\uacc4\ub85c"}
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="space-y-8 md:col-span-8">
              <div className="glass-card p-6">
                <p className="field-label">Written Dream</p>
                <h2 className="font-display text-3xl text-[var(--accent-strong)]">{title || "Untitled Dream"}</h2>
                <p className="mt-3 text-sm italic text-[var(--muted)]">{dreamDate}</p>
                <p className="mt-5 line-clamp-5 text-sm leading-7 text-[var(--muted-strong)]">{content}</p>
              </div>

              {renderTagEditor()}
            </section>

            <aside className="space-y-8 md:col-span-4">
              {renderImagePanel()}

              {errorMessage ? <div className="rounded-[24px] bg-[rgba(245,215,223,0.84)] p-5 text-sm text-[#8f4854]">{errorMessage}</div> : null}

              <div className="flex flex-col gap-3">
                <button type="button" className="secondary-button w-full py-4" onClick={() => setFormStep(1)}>
                  {"\uc774\uc804 \ub2e8\uacc4\ub85c"}
                </button>

                <button className="primary-button w-full py-4" type="submit" disabled={mutation.isPending}>
                  {mutation.isPending
                    ? "\uc800\uc7a5 \uc911..."
                    : isCreateMode
                      ? "\uc544\uce74\uc774\ube0c\uc5d0 \uc800\uc7a5"
                      : "\uc218\uc815 \uc800\uc7a5"}
                </button>

                <Link href={isCreateMode ? "/dreams" : `/dreams/${initialData?.id}`} className="secondary-button w-full py-4">
                  {isCreateMode ? "\uc791\uc131 \ucde8\uc18c" : "\uc0c1\uc138\ub85c \ub3cc\uc544\uac00\uae30"}
                </Link>
              </div>
            </aside>
          </>
        )}
      </form>
    </div>
  );
}
