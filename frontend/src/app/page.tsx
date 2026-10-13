import { SiteHeader } from '@/components/landing/site-header';
import { LandingHero } from '@/components/landing/landing-hero';
import { WorkspaceStory } from '@/components/landing/workspace-story';
import { ProductRoadmap } from '@/components/landing/product-roadmap';
import { ClosingInvite, LandingFooter } from '@/components/landing/landing-footer';

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
