import type { Metadata } from 'next';
import { LegalPage, LegalSection, legalContact } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service | Social Scheduler',
  description: 'The terms for using the Social Scheduler website and publishing workspace.',
  robots: { index: true, follow: true },
};

function TermsUse() {
  return (
    <>
      <LegalSection title="Using Social Scheduler">
        <p>
          You must provide accurate account information, keep your sign-in credentials secure, and
          use only social accounts you are authorized to manage. You are responsible for activity in
          your workspace and for reviewing the content, account, time, and visibility you choose
          before scheduling.
        </p>
      </LegalSection>
      <LegalSection title="Your content and permissions">
        <p>
          You keep ownership of your photos, videos, captions, and other content. You give Social
          Scheduler permission to store, prepare, transmit, and publish that content to the accounts
          you select so we can provide the service. You must have the rights needed to use the
          content and follow applicable laws and the selected platform’s rules, including music,
          advertising, and disclosure requirements.
        </p>
      </LegalSection>
      <LegalSection title="Connected platforms">
        <p>
          Connecting a social account authorizes the access shown by that platform’s consent screen.
          Each platform controls its own account eligibility, API permissions, review decisions,
          posting limits, processing, and content moderation. A scheduled time is when Social
          Scheduler attempts to send your content; it does not guarantee that the platform will
          publish it at that time or at all.
        </p>
        <p>
          TikTok Direct Post is currently limited to private testing until the required app review
          and audit are completed. Do not rely on Social Scheduler for time-critical or guaranteed
          publication.
        </p>
      </LegalSection>
    </>
  );
}

function TermsLimits() {
  return (
    <>
      <LegalSection title="Acceptable use">
        <p>
          Do not use the service to post content you do not have permission to use, violate another
          person’s rights, evade platform restrictions, interfere with the service, or access
          another user’s workspace. We may restrict access or remove content when needed to protect
          users, comply with law, or respond to platform requirements.
        </p>
      </LegalSection>
      <LegalSection title="Availability and changes">
        <p>
          Social Scheduler is provided as available. Features and supported platforms may change,
          and third-party outages or permission changes may interrupt connections or publishing. We
          may update these terms; the effective date above identifies this version. Continued use
          after an update means you accept the updated terms.
        </p>
      </LegalSection>
      <LegalSection title="Leaving the service">
        <p>
          You can disconnect a social account in the workspace and revoke access in that platform’s
          settings. Disconnecting does not erase earlier content or publication history. To request
          account or data removal, email{' '}
          <a
            href={`mailto:${legalContact}`}
            className="whitespace-nowrap underline underline-offset-4 hover:text-muted"
          >
            {legalContact}
          </a>
          . We will review your request and explain any records that need to be retained.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>
          Social Scheduler operates this service. For questions about these terms, email{' '}
          <a
            href={`mailto:${legalContact}`}
            className="whitespace-nowrap underline underline-offset-4 hover:text-muted"
          >
            {legalContact}
          </a>
          .
        </p>
      </LegalSection>
    </>
  );
}

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      introduction="These terms explain how you may use Social Scheduler to prepare and schedule content for social accounts you control. By creating an account or using the workspace, you agree to these terms."
    >
      <TermsUse />
      <TermsLimits />
    </LegalPage>
  );
}
