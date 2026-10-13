import Image from 'next/image';

export function AuthCompanion() {
  return (
    <aside className="hidden overflow-hidden rounded-[28px] bg-ink lg:flex lg:flex-col">
      <div className="relative min-h-[350px] flex-1">
        <Image
          src="/images/creator-studio.webp"
          alt="A camera, open notebook, and landscape prints in a creator’s studio"
          fill
          priority
          sizes="(min-width: 1280px) 560px, 50vw"
          className="object-cover object-right"
        />
      </div>
      <div className="px-10 py-10 text-paper xl:px-12">
        <h2 className="max-w-[18ch] text-3xl leading-[1.15] font-medium tracking-tight xl:text-4xl">
          A place for the ideas worth sharing.
        </h2>
        <p className="mt-4 max-w-[40ch] text-sm leading-6 text-zinc-300">
          Connect Instagram, prepare a photo or Reel, and choose when to share it.
        </p>
      </div>
    </aside>
  );
}
