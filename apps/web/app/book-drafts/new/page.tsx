import { Suspense } from "react";

import { StatePanel } from "@/components/ui/state-panel";

import { NewBookDraftClient } from "./new-book-draft-client";

export default function NewBookDraftPage() {
  return (
    <Suspense
      fallback={
        <StatePanel
          title="책 초안 구성을 준비하는 중"
          description="선택한 꿈일기와 표지 설정을 불러오고 있습니다."
        />
      }
    >
      <NewBookDraftClient />
    </Suspense>
  );
}
