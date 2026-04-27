import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { RouteBodyTheme } from "@/components/layout/route-body-theme";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "DreamArchive",
  description: "꿈을 기록하고 다시 읽으며, 마음에 남는 장면을 책으로 엮어볼 수 있는 꿈일기 서비스",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          <RouteBodyTheme />
          <div className="min-h-screen">
            <AppHeader />
            <main className="mx-auto max-w-screen-2xl px-6 pb-8 pt-32 lg:px-12">{children}</main>
            <AppFooter />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
