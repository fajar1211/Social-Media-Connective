import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Social Media Connective" },
      {
        name: "description",
        content: "Privacy Policy for Social Media Connective marketing platform.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>

        <div className="mb-10 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: September 2, 2026</p>
          </div>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-foreground dark:prose-invert">
          <section>
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p>
              Welcome to Social Media Connective ("we," "our," or "us"). We are committed to
              protecting your privacy and ensuring the security of your personal information. This
              Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our marketing platform and related services (collectively, the "Service").
            </p>
            <p>
              By accessing or using the Service, you agree to the collection and use of information
              in accordance with this policy. If you do not agree with the terms of this policy,
              please do not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>

            <h3 className="text-lg font-medium">2.1 Account Information</h3>
            <p>When you create an account, we may collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Full name and email address</li>
              <li>Organization or company name</li>
              <li>Role and permissions within the platform</li>
              <li>Authentication credentials (managed via secure OAuth providers)</li>
            </ul>

            <h3 className="text-lg font-medium">2.2 Social Media Integration Data</h3>
            <p>When you connect social media accounts, we may access:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Profile information (name, profile picture, account ID)</li>
              <li>Page and business portfolio details</li>
              <li>Access tokens required to publish content on your behalf</li>
              <li>Content you choose to publish through our platform</li>
            </ul>

            <h3 className="text-lg font-medium">2.3 Usage Data</h3>
            <p>We automatically collect certain information when you use the Service:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Device type, browser, and operating system</li>
              <li>IP address and geographic location (country/region level)</li>
              <li>Pages visited and features used within the platform</li>
              <li>Timestamps of actions and sessions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Service Delivery:</strong> To provide, operate, and maintain the marketing
                platform and its features.
              </li>
              <li>
                <strong>Content Publishing:</strong> To schedule, publish, and manage your marketing
                content across connected social media platforms.
              </li>
              <li>
                <strong>Authentication:</strong> To verify your identity and manage access to your
                account and connected services.
              </li>
              <li>
                <strong>Communication:</strong> To send administrative notifications, updates, and
                support responses related to the Service.
              </li>
              <li>
                <strong>Improvement:</strong> To analyze usage patterns and improve the functionality,
                performance, and user experience of the platform.
              </li>
              <li>
                <strong>Security:</strong> To detect, prevent, and address technical issues, fraud,
                and unauthorized access.
              </li>
              <li>
                <strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and
                legal processes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. How We Share Your Information</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may
              share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>With Social Media Platforms:</strong> When you connect and publish content,
                we share necessary data with the respective platforms (e.g., Meta/Facebook, Instagram)
                to fulfill your publishing requests.
              </li>
              <li>
                <strong>Service Providers:</strong> We may share information with trusted third-party
                service providers who assist us in operating the platform (e.g., hosting, analytics),
                subject to confidentiality obligations.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose information if required by law,
                regulation, or valid legal process.
              </li>
              <li>
                <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of
                assets, your information may be transferred as part of that transaction.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal information,
              including:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Secure authentication via OAuth 2.0 protocols</li>
              <li>Regular security assessments and vulnerability testing</li>
              <li>Access controls and monitoring of internal systems</li>
              <li>Social media access tokens are encrypted and stored securely</li>
            </ul>
            <p>
              While we strive to protect your information, no method of electronic transmission or
              storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed
              to provide the Service. When you disconnect a social media account, we remove the
              associated access tokens and integration data within a reasonable timeframe.
            </p>
            <p>
              If you delete your account, we will remove your personal data from our active systems
              within 30 days, except where retention is required by law or for legitimate business
              purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Your Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Access:</strong> Request a copy of the personal information we hold about
                you.
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate or incomplete data.
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your personal data.
              </li>
              <li>
                <strong>Portability:</strong> Request transfer of your data to another service.
              </li>
              <li>
                <strong>Objection:</strong> Object to the processing of your personal data for
                certain purposes.
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw consent where processing is based on
                consent.
              </li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:fajaralasman@gmail.com" className="text-primary underline">
                fajaralasman@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. International Data Transfers</h2>
            <p>
              Your information may be processed in countries other than your country of residence.
              These countries may have different data protection laws. We ensure that appropriate
              safeguards are in place when transferring data internationally, in compliance with
              applicable data protection regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Children's Privacy</h2>
            <p>
              The Service is not intended for individuals under the age of 18. We do not knowingly
              collect personal information from children. If we become aware that we have collected
              data from a child, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the updated policy on this page with a revised "Last
              updated" date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices,
              please contact us:
            </p>
            <div className="mt-3 rounded-lg border bg-card p-4">
              <p className="font-medium">Social Media Connective</p>
              <p className="text-muted-foreground">
                Email:{" "}
                <a href="mailto:fajaralasman@gmail.com" className="text-primary underline">
                  fajaralasman@gmail.com
                </a>
              </p>
              <p className="text-muted-foreground">
                Website:{" "}
                <a
                  href="https://socmed.marketingconnective.com"
                  className="text-primary underline"
                >
                  socmed.marketingconnective.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
