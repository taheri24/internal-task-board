import type { TaskStatus } from './types';

const jalali = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' });

/** Accepts a date-only ISO string (YYYY-MM-DD) and renders it in the Persian (Jalali) calendar. */
export function formatDue(dateOnly: string): string {
  return jalali.format(new Date(`${dateOnly}T00:00:00`));
}

export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dueDate}T00:00:00`) < today;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0)).join('') || '؟';
}
