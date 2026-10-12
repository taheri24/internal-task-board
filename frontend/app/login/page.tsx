'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { messageOf } from '@/lib/errors';
import { BTN_PRIMARY, INPUT, LABEL } from '@/lib/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      router.replace('/board');
    } catch (err) {
      setError(messageOf(err));
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-accent p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-md bg-white/15 text-lg font-extrabold">
            ت
          </span>
          <span className="text-lg font-bold">تابلو وظایف</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight">هر کار یک مسئول مشخص دارد.</h2>
          <p className="mt-4 leading-8 text-white/80">
            وظایف تیم را در یک نگاه ببینید، مسئول هر کار را بشناسید و از دیرکردها آگاه شوید. دسترسی هر نقش همیشه روی سرور بررسی می‌شود.
          </p>
        </div>

        <p className="text-sm text-white/70">نسخه آزمایشی</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-extrabold text-ink">ورود به تابلو</h1>
          <p className="mt-2 text-sm text-muted">با حساب کاربری سازمانی خود وارد شوید.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className={LABEL}>
                ایمیل
              </label>
              <input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
              />
            </div>

            <div>
              <label htmlFor="password" className={LABEL}>
                رمز عبور
              </label>
              <input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className={`${BTN_PRIMARY} w-full py-2.5`}>
              {loading ? 'در حال ورود…' : 'ورود'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
