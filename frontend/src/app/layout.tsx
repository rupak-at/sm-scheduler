import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import '@/app/globals.css';

const roboto = localFont({
  src: '../fonts/roboto-latin-wght-normal.woff2',
  variable: '--font-roboto',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Social Scheduler — a considered space for your content',
  description: 'Plan your Instagram content in one calm workspace.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#fafafa' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        <a
          className="fixed top-4 left-4 z-50 -translate-y-[200%] rounded-md border border-line bg-paper px-4 py-2 text-sm focus:translate-y-0"
          href="#main-content"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
