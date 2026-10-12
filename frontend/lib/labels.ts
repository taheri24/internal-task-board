import type { Priority, Role, TaskStatus } from './types';

export const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done'];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'برای انجام',
  in_progress: 'در حال انجام',
  done: 'انجام شده',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'بالا',
  urgent: 'فوری',
};

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'مالک',
  manager: 'مدیر',
  member: 'عضو',
};

/** Colour of the lane header rule and card start edge, keyed by status. */
export const LANE_BAR: Record<TaskStatus, string> = {
  todo: 'bg-todo',
  in_progress: 'bg-progress',
  done: 'bg-done',
};

export const CARD_EDGE: Record<TaskStatus, string> = {
  todo: 'border-s-todo',
  in_progress: 'border-s-progress',
  done: 'border-s-done',
};
