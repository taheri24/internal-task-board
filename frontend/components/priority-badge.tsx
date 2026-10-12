import type { Priority } from '@/lib/types';
import { PRIORITY_LABEL } from '@/lib/labels';

/** Colour plus text, so priority is never conveyed by colour alone. */
const STYLE: Record<Priority, string> = {
  low: 'bg-paper text-muted ring-line',
  medium: 'bg-[#E8EEF5] text-[#2F4A63] ring-[#C9D6E4]',
  high: 'bg-[#FBEBD9] text-[#8A4308] ring-[#EFD0AE]',
  urgent: 'bg-[#FDE3E0] text-[#A11D12] ring-[#F5BDB7]',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLE[priority]}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
