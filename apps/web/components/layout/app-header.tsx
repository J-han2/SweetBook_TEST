"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/dreams", label: "Archive" },
  { href: "/dreams/new", label: "Create Dream" },
  { href: "/orders", label: "My Books" },
];

function isActiveLink(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/dreams") {
    return pathname === "/dreams" || (pathname.startsWith("/dreams/") && !pathname.startsWith("/dreams/new"));
  }

  if (href === "/dreams/new") {
    return pathname === "/dreams/new";
  }

  if (href === "/orders") {
    return pathname.startsWith("/orders") || pathname.startsWith("/book-drafts");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/50 bg-white/40 backdrop-blur-xl">
      <div className="mx-auto flex h-24 max-w-screen-2xl items-center gap-10 px-6 lg:px-12">
        <div className="min-w-0">
          <Link href="/" className="font-display text-3xl italic text-[var(--accent-strong)]">
            DreamArchive
          </Link>
          <p className="hidden text-sm text-[var(--muted)] lg:block">
            꿈을 기록하고, 다시 읽고, 한 권의 책으로 엮어보세요.
          </p>
        </div>

        <nav className="ml-auto hidden items-center gap-10 pr-2 font-display text-lg text-[var(--muted)] md:flex">
          {links.map((link) => {
            const active = isActiveLink(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b pb-1 transition ${
                  active
                    ? "border-[rgba(108,95,142,0.28)] text-[var(--accent-strong)]"
                    : "border-transparent hover:border-[rgba(108,95,142,0.18)] hover:text-[var(--accent-strong)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
