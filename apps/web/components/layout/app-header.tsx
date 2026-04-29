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
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/55 bg-white/55 backdrop-blur-xl">
      <div className="mx-auto max-w-screen-2xl px-6 lg:px-12">
        <div className="flex h-20 items-center gap-10 md:h-24">
          <div className="min-w-0">
            <Link href="/" className="font-display text-3xl italic text-[var(--accent-strong)]">
              DreamArchive
            </Link>
            <p className="hidden text-sm text-[var(--muted)] lg:block">꿈을 기록하고, 다시 펼쳐보는 아카이브</p>
          </div>

          <nav className="ml-auto hidden items-center gap-10 pr-2 font-display text-lg text-[var(--muted)] md:flex">
            {links.map((link) => {
              const active = isActiveLink(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`header-nav-link ${active ? "is-active text-[var(--accent-strong)]" : "text-[var(--muted)] hover:text-[var(--accent-strong)]"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <nav className="no-scrollbar flex items-center gap-6 overflow-x-auto pb-4 font-display text-[1rem] text-[var(--muted)] md:hidden">
          {links.map((link) => {
            const active = isActiveLink(pathname, link.href);
            return (
              <Link
                key={`${link.href}-mobile`}
                href={link.href}
                className={`header-nav-link shrink-0 whitespace-nowrap ${active ? "is-active text-[var(--accent-strong)]" : "text-[var(--muted)] hover:text-[var(--accent-strong)]"}`}
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
