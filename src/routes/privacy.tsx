import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield, Mail, Globe, Lock, Eye, Database, Users, FileText, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="relative overflow-hidden border-b bg-card/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg shadow-primary/10">
              <Shield className="size-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Privacy Policy
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Last updated: September 2, 2026
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Quick Summary Cards */}
        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Lock, title: "Data Encrypted", desc: "TLS/SSL encryption" },
            { icon: Eye, title: "No Tracking", desc: "We don't sell your data" },
            { icon: Database, title: "Secure Storage", desc: "Industry-standard security" },
            { icon: Users, title: "Your Control", desc: "Delete anytime" },
          ].map((item) => (
            <div
              key={item.title}
              className="group rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:shadow-primary/5 hover:border-primary/20"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <item.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-3 font-semibold text-foreground">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          <Section
            number="1"
            title="Introduction"
            icon={FileText}
          >
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
          </Section>

          <Section
            number="2"
            title="Information We Collect"
            icon={Database}
          >
            <SubSection title="2.1 Account Information">
              <p>When you create an account, we may collect:</p>
              <ul>
                <li>Full name and email address</li>
                <li>Organization or company name</li>
                <li>Role and permissions within the platform</li>
                <li>Authentication credentials (managed via secure OAuth providers)</li>
              </ul>
            </SubSection>

            <SubSection title="2.2 Social Media Integration Data">
              <p>When you connect social media accounts, we may access:</p>
              <ul>
                <li>Profile information (name, profile picture, account ID)</li>
                <li>Page and business portfolio details</li>
                <li>Access tokens required to publish content on your behalf</li>
                <li>Content you choose to publish through our platform</li>
              </ul>
            </SubSection>

            <SubSection title="2.3 Usage Data">
              <p>We automatically collect certain information when you use the Service:</p>
              <ul>
                <li>Device type, browser, and operating system</li>
                <li>IP address and geographic location (country/region level)</li>
                <li>Pages visited and features used within the platform</li>
                <li>Timestamps of actions and sessions</li>
              </ul>
            </SubSection>
          </Section>

          <Section
            number="3"
            title="How We Use Your Information"
            icon={Eye}
          >
            <p>We use the collected information for the following purposes:</p>
            <ul>
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
          </Section>

          <Section
            number="4"
            title="How We Share Your Information"
            icon={Users}
          >
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>We do not sell, trade, or rent your personal information to third parties.</strong>
                </p>
              </div>
            </div>
            <p className="mt-4">We may share your information in the following circumstances:</p>
            <ul>
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
          </Section>

          <Section
            number="5"
            title="Data Security"
            icon={Lock}
          >
            <p>
              We implement industry-standard security measures to protect your personal information,
              including:
            </p>
            <ul>
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
          </Section>

          <Section
            number="6"
            title="Data Retention"
            icon={Database}
          >
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
          </Section>

          <Section
            number="7"
            title="Your Rights"
            icon={Shield}
          >
            <p>Depending on your location, you may have the following rights:</p>
            <ul>
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
              <a href="mailto:info@marketingconnective.com" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80">
                info@marketingconnective.com
              </a>
              .
            </p>
          </Section>

          <Section
            number="8"
            title="International Data Transfers"
            icon={Globe}
          >
            <p>
              Your information may be processed in countries other than your country of residence.
              These countries may have different data protection laws. We ensure that appropriate
              safeguards are in place when transferring data internationally, in compliance with
              applicable data protection regulations.
            </p>
          </Section>

          <Section
            number="9"
            title="Children's Privacy"
            icon={Users}
          >
            <p>
              The Service is not intended for individuals under the age of 18. We do not knowingly
              collect personal information from children. If we become aware that we have collected
              data from a child, we will take steps to delete it promptly.
            </p>
          </Section>

          <Section
            number="10"
            title="Changes to This Policy"
            icon={FileText}
          >
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the updated policy on this page with a revised "Last
              updated" date. We encourage you to review this policy periodically.
            </p>
          </Section>

          <Section
            number="11"
            title="Contact Us"
            icon={Mail}
          >
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices,
              please contact us:
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4">
                <h3 className="font-semibold text-foreground">Social Media Connective</h3>
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a
                      href="mailto:info@marketingconnective.com"
                      className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                      info@marketingconnective.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Globe className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <a
                      href="https://socmed.marketingconnective.com"
                      className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                      socmed.marketingconnective.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t pt-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Your privacy is important to us.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                © {new Date().getFullYear()} Marketing Connective. All rights reserved.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Powered by{" "}
              <a
                href="https://marketingconnective.com"
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                marketingconnective.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  number,
  title,
  icon: Icon,
  children,
}: {
  number: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
          {number}
        </div>
        <Icon className="size-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-p:leading-relaxed prose-ul:my-2 prose-li:my-1">
        {children}
      </div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-lg font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}
