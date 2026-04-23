import type { ReactNode } from "react";

export function StatePanel({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-card px-8 py-10 text-center">
      <p className="section-kicker">DreamArchive</p>
      <h3 className="mt-3 font-display text-3xl text-[var(--accent-strong)]">{title}</h3>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
