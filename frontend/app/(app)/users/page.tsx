'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ListboxField, type SelectOption } from '@/components/listbox-field';
import { PersonBadge } from '@/components/person-badge';
import { useSession } from '@/components/session';
import { api } from '@/lib/api';
import { messageOf } from '@/lib/errors';
import { ROLE_LABEL } from '@/lib/labels';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL } from '@/lib/ui';
import type { Role, SessionUser } from '@/lib/types';

const ROLE_OPTIONS: SelectOption[] = (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }));

const EMPTY_FORM = { displayName: '', email: '', password: '', role: 'member' as Role };

export default function UsersPage() {
  const me = useSession();
  const [users, setUsers] = useState<SessionUser[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await api<SessionUser[]>('/users'));
    } catch (err) {
      setError(messageOf(err));
    }
  }, []);

  useEffect(() => {
    if (me.role === 'owner') void load();
  }, [load, me.role]);

  if (me.role !== 'owner') {
    return (
      <div className="rounded-lg border border-line bg-surface p-6">
        <h1 className="text-xl font-extrabold">دسترسی ندارید</h1>
        <p className="mt-2 text-sm text-muted">مدیریت کاربران فقط برای مالک سیستم فعال است.</p>
      </div>
    );
  }

  async function changeRole(target: SessionUser, role: Role) {
    setError(null);
    setNotice(null);
    try {
      const updated = await api<SessionUser>(`/users/${target.id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setUsers((list) => list?.map((u) => (u.id === updated.id ? updated : u)) ?? list);
      setNotice(`نقش ${updated.displayName} به «${ROLE_LABEL[role]}» تغییر کرد.`);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function toggleActive(target: SessionUser) {
    setError(null);
    setNotice(null);
    const next = !target.isActive;
    try {
      const updated = await api<SessionUser>(`/users/${target.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: next }) });
      setUsers((list) => list?.map((u) => (u.id === updated.id ? updated : u)) ?? list);
      setNotice(`${updated.displayName} ${next ? 'فعال' : 'غیرفعال'} شد.`);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api('/users', { method: 'POST', body: JSON.stringify({ ...form, email: form.email.trim() }) });
      setForm(EMPTY_FORM);
      setNotice('کاربر جدید ایجاد شد.');
      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">کاربران</h1>
        <p className="mt-1 text-sm text-muted">نقش‌ها را تعیین کنید و دسترسی کاربران را فعال یا غیرفعال کنید.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-md border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          {notice}
        </p>
      )}

      <section aria-labelledby="create-user" className="rounded-lg border border-line bg-surface p-6 shadow-sm">
        <h2 id="create-user" className="text-lg font-bold">
          افزودن کاربر
        </h2>
        <form onSubmit={createUser} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5 md:items-end">
          <div>
            <label htmlFor="new-name" className={LABEL}>
              نام نمایشی
            </label>
            <input id="new-name" required minLength={2} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className={INPUT} />
          </div>
          <div>
            <label htmlFor="new-email" className={LABEL}>
              ایمیل
            </label>
            <input id="new-email" type="email" dir="ltr" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT} />
          </div>
          <div>
            <label htmlFor="new-password" className={LABEL}>
              رمز عبور اولیه
            </label>
            <input id="new-password" type="password" dir="ltr" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={INPUT} />
          </div>
          <ListboxField label="نقش" value={form.role} options={ROLE_OPTIONS} onChange={(v) => setForm({ ...form, role: v as Role })} />
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving ? 'در حال ایجاد…' : 'ایجاد کاربر'}
          </button>
        </form>
      </section>

      <section aria-labelledby="user-list" className="space-y-3">
        <h2 id="user-list" className="sr-only">
          فهرست کاربران
        </h2>
        {users === null ? (
          <div className="h-40 animate-pulse rounded-lg bg-surface ring-1 ring-line" role="status" aria-label="در حال بارگذاری کاربران" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-sm">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-paper text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">نام</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">ایمیل</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">نقش</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">وضعیت</th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">عملیات</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => (
                  <tr key={u.id} className="align-middle">
                    <td className="px-4 py-3">
                      <PersonBadge name={u.displayName} muted={!u.isActive} />
                    </td>
                    <td className="px-4 py-3 text-muted" dir="ltr">
                      {u.email}
                    </td>
                    <td className="w-48 px-4 py-3">
                      <ListboxField
                        hideLabel
                        label={`نقش ${u.displayName}`}
                        value={u.role}
                        options={ROLE_OPTIONS}
                        onChange={(v) => void changeRole(u, v as Role)}
                        disabled={u.id === me.id && u.role === 'owner'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="font-semibold text-done">فعال</span>
                      ) : (
                        <span className="text-muted">غیرفعال</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button type="button" onClick={() => void toggleActive(u)} className={BTN_SECONDARY}>
                        {u.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
