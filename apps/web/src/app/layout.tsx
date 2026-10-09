import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './globals.css';

const roboto = localFont({
  src: '../fonts/roboto-latin-wght-normal.woff2',
  variable: '--font-roboto',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Publishing planner | Social Scheduler',
  description: 'Plan your Instagram content in one calm workspace.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#eef3fa' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        <a
          className="fixed top-4 left-4 z-10 -translate-y-[200%] bg-paper px-4 py-2 focus:translate-y-0"
          href="#main-content"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
