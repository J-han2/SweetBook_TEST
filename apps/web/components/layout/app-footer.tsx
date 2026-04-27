"use client";

import { usePathname } from "next/navigation";

export function AppFooter() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (isHome) {
    return null;
  }

  return (
    <footer className="app-footer mt-24 border-t border-white/10 bg-black py-16 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-center md:flex-row md:text-left">
        <div>
          <p className="font-display text-2xl italic text-white">DreamArchive</p>
          <p className="mt-2 text-sm text-white/56">깨어난 뒤에도 다시 펼쳐보는 꿈의 기록</p>
        </div>

        <p className="text-sm italic text-white/52">© 2026 DreamArchive</p>
      </div>
    </footer>
  );
}
