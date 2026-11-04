import Link from 'next/link';
import type { ReactNode } from 'react';
import { Brand } from '@/components/brand';

export const legalContact = 'rupakb802@gmail.com';

export function LegalPage({
  title,
  introduction,
  children,
}: {
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex min-h-20 max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Brand />
          <Link href="/" className="rounded-sm py-2 text-sm text-muted hover:text-ink">
            Back to home
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20"
      >
        <div className="max-w-[720px]">
          <p className="text-sm text-muted">Effective November 4, 2026</p>
          <h1 className="mt-4 text-[clamp(2.25rem,5vw,4rem)] leading-tight font-medium tracking-[-0.045em]">
            {title}
          </h1>
          <p className="mt-6 max-w-[65ch] text-base leading-7 text-muted">{introduction}</p>
          <div className="mt-12 space-y-10 border-t border-line pt-10 text-sm leading-7 sm:text-base">
            {children}
          </div>
        </div>
      </main>
      <footer className="border-t border-line">
        <nav
          aria-label="Legal"
          className="mx-auto flex max-w-[1280px] flex-wrap gap-x-8 gap-y-2 px-5 py-7 text-sm sm:px-8 lg:px-12"
        >
          <Link href="/privacy-policy" className="rounded-sm py-1 text-muted hover:text-ink">
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" className="rounded-sm py-1 text-muted hover:text-ink">
            Terms of Service
          </Link>
          <a href={`mailto:${legalContact}`} className="rounded-sm py-1 text-muted hover:text-ink">
            Contact
          </a>
        </nav>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl leading-snug font-medium tracking-[-0.025em] sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}
