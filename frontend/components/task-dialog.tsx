'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { LockClosedIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { messageOf } from '@/lib/errors';
import { formatDue } from '@/lib/format';
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_ORDER } from '@/lib/labels';
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL } from '@/lib/ui';
import type { DirectoryEntry, JSONNode, Priority, SessionUser, Task, TaskStatus } from '@/lib/types';
import { ListboxField, type SelectOption } from './listbox-field';
import { RichEditor } from './rich-editor';

const EMPTY_DOC: JSONNode = { type: 'doc', content: [] };
const STATUS_OPTIONS: SelectOption[] = STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }));
const PRIORITY_OPTIONS: SelectOption[] = (Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => ({
  value: p,
  label: PRIORITY_LABEL[p],
}));

export interface TaskDialogProps {
  open: boolean;
  /** null means create */
  task: Task | null;
  me: SessionUser;
  people: DirectoryEntry[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: (id: string) => void;
}

export function TaskDialog(props: TaskDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} className="relative z-50">
      <DialogBackdrop transition={false} className="fixed inset-0 bg-ink/35" />
      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <DialogPanel className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl bg-surface shadow-2xl sm:rounded-xl">
          {props.open && <TaskForm {...props} />}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

/** Mounted only while open, so every open starts from fresh state. */
function TaskForm({ task, me, people, onClose, onSaved, onDeleted }: Omit<TaskDialogProps, 'open'>) {
  const isNew = task === null;
  const isStaff = me.role !== 'member';

  // Mirrors the API policy. The server enforces it, and this only drives the UI.
  const canEditContent = isNew || isStaff || task?.createdBy.id === me.id || task?.assignee?.id === me.id;
  const canEditStatus = isNew || isStaff || task?.assignee?.id === me.id;
  const canEditAssignee = isStaff;
  const canDelete = !isNew && (isStaff || task?.createdBy.id === me.id);
  const readOnly = !canEditContent;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState<JSONNode>(task?.description ?? EMPTY_DOC);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [assigneeId, setAssigneeId] = useState<string>(task?.assignee?.id ?? me.id);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const assigneeOptions: SelectOption[] = [
    { value: '', label: 'بدون مسئول' },
    ...people
      .filter((p) => p.isActive || p.id === task?.assignee?.id)
      .map((p) => ({ value: p.id, label: p.isActive ? p.displayName : `${p.displayName} (غیرفعال)` })),
  ];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (readOnly) return;
    if (!title.trim()) {
      setError('عنوان وظیفه الزامی است.');
      return;
    }

    const body: Record<string, unknown> = {
      title: title.trim(),
      description,
      priority,
      dueDate: dueDate || null,
    };
    if (canEditStatus) body.status = status;
    // Members are never sent assigneeId. The server ignores it on create and rejects a change on update.
    if (canEditAssignee) body.assigneeId = assigneeId || null;

    setPending(true);
    setError(null);
    try {
      await api<Task>(isNew ? '/todos' : `/todos/${task.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(messageOf(err));
      setPending(false);
    }
  }

  async function onDelete() {
    if (!task) return;
    setPending(true);
    try {
      await api<void>(`/todos/${task.id}`, { method: 'DELETE' });
      onDeleted(task.id);
    } catch (err) {
      setError(messageOf(err));
      setPending(false);
      setConfirmDelete(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <DialogTitle className="text-lg font-extrabold text-ink">{isNew ? 'وظیفه جدید' : 'جزئیات وظیفه'}</DialogTitle>
          {task && <p className="mt-1 text-xs text-muted">ایجادشده توسط {task.createdBy.displayName}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن"
          className="rounded p-1 text-muted hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <XMarkIcon className="size-5" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div>
          <label htmlFor="task-title" className={LABEL}>
            عنوان
          </label>
          <input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            disabled={readOnly}
            autoFocus
            className={INPUT}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {canEditStatus ? (
            <ListboxField
              label="وضعیت"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(v) => setStatus(v as TaskStatus)}
              disabled={readOnly}
            />
          ) : (
            <ReadOnlyField
              label="وضعیت"
              value={task ? STATUS_LABEL[task.status] : ''}
              hint="فقط مسئول وظیفه می‌تواند وضعیت را تغییر دهد."
            />
          )}

          <ListboxField
            label="اولویت"
            value={priority}
            options={PRIORITY_OPTIONS}
            onChange={(v) => setPriority(v as Priority)}
            disabled={readOnly}
          />

          {canEditAssignee ? (
            <ListboxField label="مسئول" value={assigneeId} options={assigneeOptions} onChange={setAssigneeId} disabled={readOnly} />
          ) : (
            <ReadOnlyField
              label="مسئول"
              locked
              value={isNew ? me.displayName : task?.assignee?.displayName ?? 'بدون مسئول'}
              hint={isNew ? 'وظایفی که می‌سازید به خودتان اختصاص داده می‌شوند.' : 'فقط مدیر یا مالک می‌تواند مسئول را تغییر دهد.'}
            />
          )}

          <div>
            <label htmlFor="task-due" className={LABEL}>
              مهلت انجام
            </label>
            <input
              id="task-due"
              type="date"
              dir="ltr"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={readOnly}
              className={INPUT}
            />
            {dueDate && <p className="mt-1 text-xs text-muted">{formatDue(dueDate)}</p>}
          </div>
        </div>

        <div>
          <p className={LABEL}>توضیحات</p>
          <RichEditor
            key={task?.id ?? 'new'}
            value={description}
            onChange={setDescription}
            readOnly={readOnly}
            label="توضیحات وظیفه"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/60 px-6 py-4">
        <div>
          {canDelete && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded text-sm font-semibold text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            >
              حذف وظیفه
            </button>
          )}
          {confirmDelete && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink">این وظیفه به سطل زباله منتقل شود؟</span>
              <button type="button" autoFocus onClick={() => setConfirmDelete(false)} className={BTN_SECONDARY}>
                انصراف
              </button>
              <button type="button" onClick={onDelete} disabled={pending} className={BTN_DANGER}>
                حذف
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            بستن
          </button>
          {!readOnly && (
            <button type="submit" disabled={pending} className={BTN_PRIMARY}>
              {pending ? 'در حال ذخیره…' : isNew ? 'ایجاد وظیفه' : 'ذخیره تغییرات'}
            </button>
          )}
        </div>
      </footer>
    </form>
  );
}

function ReadOnlyField({
  label,
  value,
  hint,
  locked = false,
}: {
  label: string;
  value: string;
  hint?: string;
  locked?: boolean;
}) {
  return (
    <div>
      <p className={`${LABEL} flex items-center gap-1`}>
        {label}
        {locked && <LockClosedIcon className="size-4 text-muted" aria-label="فقط‌خواندنی" />}
      </p>
      <div
        aria-readonly="true"
        title={hint}
        className="flex min-h-[38px] items-center rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink"
      >
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
