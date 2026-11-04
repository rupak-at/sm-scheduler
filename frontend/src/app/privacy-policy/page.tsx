import type { Metadata } from 'next';
import { LegalPage, LegalSection, legalContact } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy | Social Scheduler',
  description:
    'How Social Scheduler handles account, connected channel, and scheduled content data.',
  robots: { index: true, follow: true },
};

function PrivacyInformation() {
  return (
    <>
      <LegalSection title="Who operates the service">
        <p>
          Social Scheduler operates this service. For privacy questions or requests, email{' '}
          <a
            href={`mailto:${legalContact}`}
            className="whitespace-nowrap underline underline-offset-4 hover:text-muted"
          >
            {legalContact}
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Information we collect">
        <ul className="list-disc space-y-2 pl-5 marker:text-muted">
          <li>
            Account details such as your name, email address, stored password hash, timezone, and
            sign-in session information, including IP address and browser user agent where recorded.
          </li>
          <li>
            Connected social account identifiers, display names, granted permissions, connection
            status, and access credentials needed to use the social APIs you authorize.
          </li>
          <li>
            Content you add to the workspace, including uploaded photos or videos, captions,
            hashtags, channel settings, schedules, and publication history.
          </li>
          <li>
            Technical and security information needed to operate the service, investigate failures,
            and protect accounts.
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="How we use information">
        <p>
          We use this information to create your workspace, keep you signed in, connect and check
          your chosen accounts, prepare media, schedule and send posts you authorize, display
          outcomes, and maintain the security and reliability of the service. Provider credentials
          are stored encrypted and are not returned to your browser.
        </p>
      </LegalSection>
      <LegalSection title="When information is shared">
        <p>
          When you connect a channel or schedule a publication, we exchange the necessary account,
          media, caption, and settings data with the selected platform: Instagram, Facebook, TikTok,
          or YouTube. We also use hosting, database, queue, and protected media storage providers,
          including Cloudinary, to run the service. Those providers process information for their
          respective services and may apply their own policies.
        </p>
        <p>
          We may disclose information if required by law or to protect the service and its users. We
          do not sell your content or connected account credentials.
        </p>
      </LegalSection>
    </>
  );
}

function PrivacyChoices() {
  return (
    <>
      <LegalSection title="Storage, security, and retention">
        <p>
          We use session cookies for sign-in and security. Uploaded media is stored in protected
          storage, and connected account tokens are encrypted at rest. No system can guarantee
          complete security.
        </p>
        <p>
          Workspace records and media can remain while your account is active. Disconnecting a
          social account removes its stored access token but does not automatically erase previous
          posts, media, or publication history. Some records may need to remain for security, legal,
          or operational reasons. Fixed production retention periods and self-service account
          deletion are not yet available.
        </p>
      </LegalSection>
      <LegalSection title="Your choices and requests">
        <p>
          You can edit or delete eligible drafts, cancel eligible scheduled posts, and disconnect
          social accounts in the workspace. You can also revoke an app’s access in that platform’s
          settings. To ask about access, correction, or deletion of your Social Scheduler data,
          email{' '}
          <a
            href={`mailto:${legalContact}`}
            className="whitespace-nowrap underline underline-offset-4 hover:text-muted"
          >
            {legalContact}
          </a>
          . We will review the request and explain what can be done.
        </p>
      </LegalSection>
      <LegalSection title="Changes and contact">
        <p>
          We may update this policy as the service changes. The effective date above identifies this
          version. For questions, contact{' '}
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

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      introduction="Social Scheduler helps creators prepare and schedule posts for connected social accounts. This policy explains the information we handle when you use the website and workspace."
    >
      <PrivacyInformation />
      <PrivacyChoices />
    </LegalPage>
  );
}
