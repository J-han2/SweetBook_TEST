"use client";

import { usePathname } from "next/navigation";

export function AppFooter() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAdmin = pathname.startsWith("/admin");

  if (isHome || isAdmin) {
    return null;
  }

  return (
    <footer className="app-footer mt-24 border-t border-white/10 bg-black py-16 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-center md:flex-row md:text-left">
        <div>
          <p className="font-display text-2xl italic text-white">DreamArchive</p>
          <p className="mt-2 text-sm text-white/56">스위트북 바이브코딩 개발 과제</p>
        </div>

        <p className="text-sm italic text-white/52">©지원자 김정한</p>
      </div>
    </footer>
  );
}
