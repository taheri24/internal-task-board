import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './globals.css';

/** Vazirmatn (SIL Open Font License) is vendored so builds do not depend on external font hosts. */
const vazir = localFont({
  src: './fonts/Vazirmatn-Variable.woff2',
  variable: '--font-vazir',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'تابلو وظایف',
  description: 'مدیریت وظایف تیم با دسترسی بر اساس نقش',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
        >
          رفتن به محتوای اصلی
        </a>
        {children}
      </body>
    </html>
  );
}
