'use client';
import Link from 'next/link';
import type { ComponentProps } from 'react';

type ComposerLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'onNavigate' | 'prefetch'> & {
  href: string;
};

export function ComposerLink({ href, ...props }: ComposerLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onNavigate={(event) => {
        const target = new URL(href, window.location.href);
        if (target.hash || !target.searchParams.has('compose')) return;
        event.preventDefault();
        // Opening the loaded editor changes UI state, so it should not wait for an API render.
        window.history.pushState(null, '', href);
      }}
    />
  );
}
