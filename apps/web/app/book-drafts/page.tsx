import { Suspense } from "react";

import { StatePanel } from "@/components/ui/state-panel";

import { BookDraftsClient } from "./book-drafts-client";

export default function BookDraftsPage() {
  return (
    <Suspense
      fallback={
        <StatePanel
          title="책 만들기 화면을 준비하는 중"
          description="필터와 선택한 꿈, 저장된 초안을 불러오고 있어요."
        />
      }
    >
      <BookDraftsClient />
    </Suspense>
  );
}
