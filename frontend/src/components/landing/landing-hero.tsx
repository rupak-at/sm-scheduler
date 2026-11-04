import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';

export function LandingHero() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 pt-16 sm:px-8 sm:pt-20 lg:px-12 lg:pt-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-[clamp(2.75rem,6.2vw,5.5rem)] leading-[1.04] font-medium tracking-[-0.055em]">
          Great content.
          <br />
          Clearer plans.
        </h1>
        <p className="mx-auto mt-6 max-w-[38ch] text-base leading-7 text-muted sm:text-lg">
          A considered space for your ideas, your content, and the moments you want to share.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild className="h-12 rounded-full px-6">
            <Link href="/signup">
              Create your workspace
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
          <Link
            href="#workspace"
            className="flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-medium hover:bg-surface"
          >
            Take a closer look
            <ArrowDown size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-5 text-xs leading-5 text-muted">
          Plan photos and videos across connected accounts. YouTube supports video; TikTok starts in
          private testing.
        </p>
      </div>
      <div className="mt-14 overflow-hidden rounded-[24px] bg-ink sm:mt-16 sm:rounded-[32px]">
        <div className="grid sm:min-h-[420px] sm:grid-cols-[0.9fr_1.1fr] lg:min-h-[480px] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="order-2 flex flex-col justify-between gap-8 px-7 py-9 text-paper sm:order-1 sm:px-8 sm:py-10 lg:p-12">
            <BrandMark className="size-8" />
            <div>
              <h2 className="text-[28px] leading-[1.15] font-medium tracking-tight sm:text-[30px] lg:text-[40px]">
                A little structure.
                <br />A lot of possibility.
              </h2>
              <p className="mt-5 max-w-[32ch] text-sm leading-6 text-zinc-300">
                For the notes, the almost-ready ideas, and the work you can’t wait to put out into
                the world.
              </p>
            </div>
            <p className="text-xs text-zinc-300">Built for independent creators.</p>
          </div>
          <div className="relative order-1 min-h-[260px] sm:order-2 sm:min-h-full">
            <Image
              src="/images/creator-studio.webp"
              alt="A creator’s camera, blank notebook, and landscape prints on a sunlit desk"
              fill
              priority
              sizes="(min-width: 1280px) 710px, (min-width: 640px) 60vw, 100vw"
              className="object-cover object-right"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
