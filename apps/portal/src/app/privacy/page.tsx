import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Loop_cmbntr",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mb-10 text-sm text-neutral-400">
        Last updated: 23 July 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-neutral-300">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">
            Who we are
          </h2>
          <p>
            Loop_cmbntr is operated by Loop TGP LLC. This policy explains how we
            collect, use, and protect your information when you use the
            Loop_cmbntr governance platform at gov.loopcmbntr.live and
            console.loopcmbntr.live.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">
            Information we collect
          </h2>
          <p className="mb-2">
            When you create an account or sign in, we collect:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Account information:</strong> your email address, display
              name, and profile picture (if provided via social sign-in).
            </li>
            <li>
              <strong>Authentication data:</strong> if you sign in with Google,
              LinkedIn, X, or Apple, we receive your public profile information
              from that provider. We do not receive or store your password from
              those services.
            </li>
            <li>
              <strong>Platform activity:</strong> your community memberships,
              votes, proposals, delegations, and accreditations within the
              platform.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">
            How we use your information
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To create and manage your account.</li>
            <li>To enable governance features: voting, proposals, delegations, and community participation.</li>
            <li>To calculate token distributions and earnings.</li>
            <li>To communicate with you about your account and platform activity.</li>
            <li>To maintain the security and integrity of the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">
            Data storage and security
          </h2>
          <p>
            Your data is stored securely using Supabase, which provides
            encryption at rest and in transit. Authentication is handled through
            Supabase Auth with industry-standard OAuth 2.0 and OpenID Connect
            protocols. We do not sell, rent, or share your personal information
            with third parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">
            Third-party services
          </h2>
          <p className="mb-2">We use the following third-party services:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Supabase:</strong> database and authentication hosting.
            </li>
            <li>
              <strong>Vercel:</strong> application hosting and deployment.
            </li>
            <li>
              <strong>Google, LinkedIn, X, Apple:</strong> optional
              social sign-in providers. Each has its own privacy policy governing
              the data they share with us.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">
            Your rights
          </h2>
          <p>You have the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Withdraw consent for data processing at any time.</li>
            <li>Export your data in a portable format.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">
            Cookies
          </h2>
          <p>
            We use essential cookies only: authentication session cookies and a
            subject-preference cookie. We do not use tracking cookies or
            third-party analytics cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">
            Changes to this policy
          </h2>
          <p>
            We may update this policy from time to time. We will notify
            registered users of any significant changes via email or an
            in-platform notice.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">
            Contact
          </h2>
          <p>
            If you have questions about this privacy policy or your data, contact
            us at{" "}
            <a
              href="mailto:samuel@loopinc.live"
              className="text-amber-400 hover:underline"
            >
              samuel@loopinc.live
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
