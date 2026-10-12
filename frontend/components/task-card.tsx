'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import { formatDue, isOverdue } from '@/lib/format';
import { CARD_EDGE, STATUS_LABEL, STATUS_ORDER } from '@/lib/labels';
import type { SessionUser, Task, TaskStatus } from '@/lib/types';
import { PersonBadge } from './person-badge';
import { PriorityBadge } from './priority-badge';

interface Props {
  task: Task;
  me: SessionUser;
  onOpen: () => void;
  onMove: (status: TaskStatus) => void;
}

export function TaskCard({ task, me, onOpen, onMove }: Props) {
  const overdue = isOverdue(task.dueDate, task.status);
  // Members can move only tasks assigned to them, matching the API rule.
  const canMove = me.role !== 'member' || task.assignee?.id === me.id;
  const otherStatuses = STATUS_ORDER.filter((s) => s !== task.status);

  return (
    <article
      className={`rounded-md border border-line border-s-4 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md ${CARD_EDGE[task.status]}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 text-start text-[15px] font-semibold leading-7 text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          {task.title}
        </button>

        {canMove && (
          <Menu>
            <MenuButton
              aria-label={`عملیات برای ${task.title}`}
              className="rounded p-1 text-muted hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
            </MenuButton>
            <MenuItems
              anchor="bottom end"
              className="z-[60] mt-1 w-56 rounded-md border border-line bg-white p-1 text-sm shadow-lg focus:outline-none"
            >
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted">انتقال به ستون</p>
              {otherStatuses.map((s) => (
                <MenuItem key={s}>
                  {({ focus }) => (
                    <button
                      type="button"
                      onClick={() => onMove(s)}
                      className={`block w-full rounded px-3 py-2 text-start ${focus ? 'bg-accent-soft' : ''}`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  )}
                </MenuItem>
              ))}
            </MenuItems>
          </Menu>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority} />
        {overdue && (
          <span className="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
            دیرکرد
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
        {task.dueDate ? (
          <time dateTime={task.dueDate} className={overdue ? 'font-semibold text-danger' : ''}>
            {formatDue(task.dueDate)}
          </time>
        ) : (
          <span>بدون مهلت</span>
        )}

        {task.assignee ? (
          <PersonBadge
            name={task.assignee.isActive === false ? `${task.assignee.displayName} (غیرفعال)` : task.assignee.displayName}
            muted={task.assignee.isActive === false}
          />
        ) : (
          <span>بدون مسئول</span>
        )}
      </div>
    </article>
  );
}
