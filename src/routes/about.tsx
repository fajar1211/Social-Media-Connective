import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Megaphone,
  Globe,
  Calendar,
  Users,
  BarChart3,
  Zap,
  Mail,
  Shield,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Social Media Connective" },
      {
        name: "description",
        content:
          "Social Media Connective is an all-in-one marketing platform for managing social media content across multiple channels.",
      },
    ],
  }),
  component: About,
});

function About() {
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
              <Megaphone className="size-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                About Social Media Connective
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                All-in-One Marketing Platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Mission */}
        <section className="mb-12 rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">
            Our Mission
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Social Media Connective empowers businesses and marketing teams to
            manage their social media presence efficiently from a single
            dashboard. We simplify content creation, scheduling, and publishing
            across multiple platforms — so you can focus on what matters most:
            growing your business.
          </p>
        </section>

        {/* What We Do */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold text-foreground">
            What We Do
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Calendar,
                title: "Content Scheduling",
                desc: "Plan and schedule posts across multiple social media platforms in advance.",
              },
              {
                icon: Globe,
                title: "Multi-Platform Publishing",
                desc: "Publish content to Facebook, Instagram, and Google Business Profile from one place.",
              },
              {
                icon: Zap,
                title: "AI Content Generation",
                desc: "Generate engaging marketing copy and captions with built-in AI assistance.",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                desc: "Manage multiple client accounts with role-based access for teams and agencies.",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                desc: "Track performance metrics and engagement across all connected platforms.",
              },
              {
                icon: Shield,
                title: "Secure Integrations",
                desc: "OAuth 2.0 authentication ensures your social media accounts stay secure.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:shadow-primary/5 hover:border-primary/20"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <item.icon className="size-5 text-primary" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Supported Platforms */}
        <section className="mb-12 rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">
            Supported Platforms
          </h2>
          <p className="mb-4 text-muted-foreground">
            Social Media Connective currently supports the following platforms:
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { name: "Facebook", available: true },
              { name: "Instagram", available: true },
              { name: "Google Business Profile", available: true },
              { name: "X / Twitter", available: true },
              { name: "LinkedIn", available: true },
              { name: "Blog", available: false },
            ].map((platform) => (
              <span
                key={platform.name}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                  platform.available
                    ? "border-primary/20 bg-primary/5 text-primary"
                    : "border-muted bg-muted/50 text-muted-foreground"
                }`}
              >
                <Globe className="size-4" />
                {platform.name}
                {!platform.available && (
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    Coming Soon
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            We are continuously working to add support for additional platforms
            based on user demand.
          </p>
        </section>

        {/* How It Works */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold text-foreground">
            How It Works
          </h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Connect Your Accounts",
                desc: "Link your social media accounts using secure OAuth authentication. We never store your passwords.",
              },
              {
                step: "2",
                title: "Create Content",
                desc: "Use our intuitive editor to craft posts, or let our AI assistant help you generate engaging content.",
              },
              {
                step: "3",
                title: "Publish & Schedule",
                desc: "Publish immediately or schedule posts for optimal times. Manage all your platforms from one dashboard.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">
            Contact Us
          </h2>
          <p className="mb-6 text-muted-foreground">
            Have questions about Social Media Connective? We&apos;d love to hear
            from you.
          </p>
          <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="space-y-4 p-6">
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
                    href="https://marketingconnective.com"
                    className="font-medium text-foreground transition-colors hover:text-primary"
                  >
                    marketingconnective.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Legal Links */}
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Megaphone className="size-6 text-primary" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <Link
                to="/privacy"
                className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                <Shield className="size-4" />
                Privacy Policy
              </Link>
              <span className="text-muted-foreground/30">|</span>
              <a
                href="https://www.marketingconnective.com/services"
                className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                <ExternalLink className="size-4" />
                Terms of Service
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Marketing Connective. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
