import Link from 'next/link';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  return (
    <header className="border-b border-line/70 bg-paper">
      <div className="mx-auto flex min-h-20 max-w-[1280px] items-center justify-between gap-3 px-[max(20px,env(safe-area-inset-left))] py-4 sm:px-8 lg:px-12">
        <Brand />
        <nav aria-label="Main" className="hidden items-center gap-8 text-sm text-muted md:flex">
          <Link href="#workspace" className="rounded-sm hover:text-ink">
            The workspace
          </Link>
          <Link href="#roadmap" className="rounded-sm hover:text-ink">
            What’s next
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="hidden rounded-md px-1.5 py-2 text-xs font-medium hover:text-muted min-[360px]:inline-flex sm:px-2 sm:text-sm"
          >
            Log in
          </Link>
          <Button asChild className="h-11 rounded-full px-3 text-xs sm:px-4 sm:text-sm">
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
