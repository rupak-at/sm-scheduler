import { SiteHeader } from '@/features/landing/components/site-header';
import { LandingHero } from '@/features/landing/components/landing-hero';
import { WorkspaceStory } from '@/features/landing/components/workspace-story';
import { ProductRoadmap } from '@/features/landing/components/product-roadmap';
import { ClosingInvite, LandingFooter } from '@/features/landing/components/landing-footer';

export default function LandingPage() {
  return (
    <div className="bg-paper">
      <SiteHeader />
      <main id="main-content">
        <LandingHero />
        <WorkspaceStory />
        <ProductRoadmap />
        <ClosingInvite />
      </main>
      <LandingFooter />
    </div>
  );
}
