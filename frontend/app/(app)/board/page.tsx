'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListboxField, type SelectOption } from '@/components/listbox-field';
import { TaskCard } from '@/components/task-card';
import { TaskDialog } from '@/components/task-dialog';
import { useSession } from '@/components/session';
import { api } from '@/lib/api';
import { messageOf } from '@/lib/errors';
import { isOverdue } from '@/lib/format';
import { LANE_BAR, PRIORITY_LABEL, STATUS_LABEL, STATUS_ORDER } from '@/lib/labels';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL } from '@/lib/ui';
import type { DirectoryEntry, Priority, Task, TaskStatus } from '@/lib/types';

interface Filters {
  q: string;
  status: string;
  priority: string;
  assignee: string;
}

const EMPTY_FILTERS: Filters = { q: '', status: '', priority: '', assignee: '' };
const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as (keyof Filters)[];

function readFiltersFromUrl(): Filters {
  const params = new URLSearchParams(window.location.search);
  const next = { ...EMPTY_FILTERS };
  FILTER_KEYS.forEach((k) => {
    next[k] = params.get(k) ?? '';
  });
  return next;
}

type DialogState = { mode: 'create' } | { mode: 'edit'; task: Task } | null;

export default function BoardPage() {
  const me = useSession();
  const isMember = me.role === 'member';

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [people, setPeople] = useState<DirectoryEntry[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  // Filters are read from the URL after mount to avoid a hydration mismatch.
  useEffect(() => {
    setFilters(readFiltersFromUrl());
    setReady(true);
    api<DirectoryEntry[]>('/users/directory')
      .then(setPeople)
      .catch(() => setPeople([]));
  }, []);

  // Filters live in the URL, so a filtered view can be bookmarked or shared.
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    FILTER_KEYS.forEach((k) => {
      if (filters[k]) params.set(k, filters[k]);
    });
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [filters, ready]);

  const loadTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.assignee) params.set('assigneeId', filters.assignee);
    if (filters.q.trim()) params.set('q', filters.q.trim());
    try {
      setError(null);
      setTasks(await api<Task[]>(`/todos?${params.toString()}`));
    } catch (err) {
      setError(messageOf(err));
      setTasks((prev) => prev ?? []);
    }
  }, [filters]);

  // Debounced so that typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => void loadTasks(), 250);
    return () => clearTimeout(timer);
  }, [loadTasks, ready]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  // Optimistic move. The card updates at once and rolls back if the server refuses.
  async function moveTask(task: Task, status: TaskStatus) {
    const previous = tasks;
    setError(null);
    setTasks((ts) => ts?.map((t) => (t.id === task.id ? { ...t, status } : t)) ?? ts);
    try {
      const updated = await api<Task>(`/todos/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setTasks((ts) => ts?.map((t) => (t.id === updated.id ? updated : t)) ?? ts);
    } catch (err) {
      setTasks(previous);
      setError(messageOf(err));
    }
  }

  const grouped = useMemo(() => {
    const out: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    (tasks ?? []).forEach((t) => out[t.status].push(t));
    return out;
  }, [tasks]);

  const overdueCount = (tasks ?? []).filter((t) => isOverdue(t.dueDate, t.status)).length;

  const statusOptions: SelectOption[] = [
    { value: '', label: 'همه وضعیت‌ها' },
    ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  ];
  const priorityOptions: SelectOption[] = [
    { value: '', label: 'همه اولویت‌ها' },
    ...(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] })),
  ];
  const assigneeOptions: SelectOption[] = isMember
    ? [
        { value: '', label: 'همه وظایف قابل مشاهده' },
        { value: 'me', label: 'فقط وظایف من' },
      ]
    : [
        { value: '', label: 'همه مسئولان' },
        { value: 'me', label: 'وظایف من' },
        { value: 'unassigned', label: 'بدون مسئول' },
        ...people.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.displayName })),
      ];

  const hasActiveFilters = FILTER_KEYS.some((k) => filters[k] !== '');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">تابلو کارها</h1>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {tasks ? `${tasks.length} وظیفه` : 'در حال بارگذاری…'}
            {overdueCount > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-danger">{overdueCount} وظیفه دیرکرد</span>
              </>
            )}
          </p>
        </div>
        <button type="button" onClick={() => setDialog({ mode: 'create' })} className={BTN_PRIMARY}>
          وظیفه جدید
        </button>
      </header>

      <section
        aria-label="فیلترها"
        className="grid gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-end"
      >
        <div>
          <label htmlFor="search" className={LABEL}>
            جستجو
          </label>
          <input
            id="search"
            type="search"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="عنوان یا متن وظیفه"
            className={INPUT}
          />
        </div>
        <ListboxField label="وضعیت" value={filters.status} options={statusOptions} onChange={(v) => updateFilter('status', v)} />
        <ListboxField label="اولویت" value={filters.priority} options={priorityOptions} onChange={(v) => updateFilter('priority', v)} />
        <ListboxField label="مسئول" value={filters.assignee} options={assigneeOptions} onChange={(v) => updateFilter('assignee', v)} />
        <button
          type="button"
          onClick={() => setFilters(EMPTY_FILTERS)}
          disabled={!hasActiveFilters}
          className={BTN_SECONDARY}
        >
          پاک کردن فیلترها
        </button>
      </section>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <button type="button" onClick={() => void loadTasks()} className="font-semibold underline underline-offset-4">
            تلاش دوباره
          </button>
        </div>
      )}

      {tasks === null ? (
        <BoardSkeleton />
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {STATUS_ORDER.map((status) => (
            <section
              key={status}
              aria-labelledby={`lane-${status}`}
              className="flex min-h-[320px] flex-col rounded-lg bg-surface/70 ring-1 ring-line"
            >
              <div className="border-b border-line px-4 pb-3 pt-4">
                <div aria-hidden="true" className={`mb-3 h-1 w-12 rounded-full ${LANE_BAR[status]}`} />
                <h2 id={`lane-${status}`} className="flex items-center justify-between text-base font-bold text-ink">
                  <span>{STATUS_LABEL[status]}</span>
                  <span className="rounded-full bg-paper px-2.5 py-0.5 text-sm tabular-nums text-muted">
                    {grouped[status].length}
                  </span>
                </h2>
              </div>

              <ul className="flex flex-1 flex-col gap-3 p-3">
                {grouped[status].length === 0 ? (
                  <li className="grid flex-1 place-items-center rounded-md border border-dashed border-line p-6 text-center text-sm text-muted">
                    {hasActiveFilters ? 'موردی با این فیلترها نیست.' : 'وظیفه‌ای در این ستون نیست.'}
                  </li>
                ) : (
                  grouped[status].map((task) => (
                    <li key={task.id}>
                      <TaskCard
                        task={task}
                        me={me}
                        onOpen={() => setDialog({ mode: 'edit', task })}
                        onMove={(s) => void moveTask(task, s)}
                      />
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      <TaskDialog
        open={dialog !== null}
        task={dialog?.mode === 'edit' ? dialog.task : null}
        me={me}
        people={people}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          void loadTasks();
        }}
        onDeleted={(id) => {
          setDialog(null);
          setTasks((ts) => ts?.filter((t) => t.id !== id) ?? ts);
        }}
      />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-3" role="status" aria-label="در حال بارگذاری وظایف">
      {STATUS_ORDER.map((s) => (
        <div key={s} className="min-h-[320px] animate-pulse rounded-lg bg-surface/70 ring-1 ring-line p-4">
          <div className="mb-4 h-1 w-12 rounded-full bg-line" />
          <div className="h-4 w-1/2 rounded bg-line" />
          <div className="mt-5 space-y-3">
            <div className="h-24 rounded-md bg-line/60" />
            <div className="h-24 rounded-md bg-line/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
