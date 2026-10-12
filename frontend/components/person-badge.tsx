import { initials } from '@/lib/format';

/** Avatar with initials plus the display name. Email is never shown on task surfaces. */
export function PersonBadge({ name, muted = false }: { name: string; muted?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-ink"
      >
        {initials(name)}
      </span>
      <span className={`truncate ${muted ? 'text-muted' : 'text-ink'}`}>{name}</span>
    </span>
  );
}
