import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="mt-24 border-t border-white/40 py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-center md:flex-row md:text-left">
        <div>
          <p className="font-display text-2xl italic text-[var(--accent-strong)]">DreamArchive</p>
          <p className="mt-2 text-sm italic text-[var(--muted)]">잠에서 깨어도 남겨 두는 꿈의 기록.</p>
        </div>

        <nav className="flex flex-wrap justify-center gap-6 text-sm italic text-[var(--muted)]">
          <Link href="/" className="hover:text-[var(--accent-strong)]">
            Home
          </Link>
          <Link href="/dreams" className="hover:text-[var(--accent-strong)]">
            Archive
          </Link>
          <Link href="/book-drafts" className="hover:text-[var(--accent-strong)]">
            Create Book
          </Link>
          <Link href="/orders" className="hover:text-[var(--accent-strong)]">
            My Books
          </Link>
        </nav>

        <p className="text-sm italic text-[var(--muted)]">© 2026 DreamArchive</p>
      </div>
    </footer>
  );
}
