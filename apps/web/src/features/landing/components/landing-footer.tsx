import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';

export function ClosingInvite() {
  return (
    <section className="px-6 py-20 text-center sm:py-28">
      <h2 className="text-[clamp(2rem,4vw,3.5rem)] leading-tight font-medium tracking-[-0.04em]">
        Make space for your next idea.
      </h2>
      <p className="mt-5 text-base text-muted">Start with a workspace that feels like yours.</p>
      <Button asChild className="mt-8 h-12 rounded-full px-6">
        <Link href="/signup">
          Create your workspace
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-5 py-8 sm:px-8 lg:px-12">
        <Brand />
        <p className="text-xs text-muted">Made for your creative rhythm.</p>
        <Link href="/login" className="rounded-sm py-2 text-sm text-muted hover:text-ink">
          Log in to your workspace
        </Link>
      </div>
    </footer>
  );
}
