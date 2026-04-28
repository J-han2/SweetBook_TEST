import type { ReactNode } from "react";

// Admin pages use the root layout (which includes QueryProvider).
// This layout overrides the inner <main> wrapper to allow full-width admin UI.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
