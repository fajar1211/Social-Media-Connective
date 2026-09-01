import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Share2,
  FileText,
  CheckCircle2,
  Calendar,
  Shield,
  Zap,
  Users,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Social Media Connective — Marketing Content Management" },
      {
        name: "description",
        content:
          "Create, manage, and approve marketing content across all social media platforms in one powerful admin dashboard.",
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: FileText,
    title: "Content Creation",
    description:
      "Create marketing content with AI assistance. Generate posts tailored to each platform with the right tone and style.",
  },
  {
    icon: Share2,
    title: "Multi-Platform",
    description:
      "Manage Facebook, Instagram, LinkedIn, X/Twitter, and Blog content from a single dashboard.",
  },
  {
    icon: CheckCircle2,
    title: "Approval Workflow",
    description:
      "Streamlined review process: Suggested, Submitted, Approved. Keep your content pipeline organized.",
  },
  {
    icon: Calendar,
    title: "Scheduling",
    description:
      "Schedule posts for later or publish immediately. Plan your content calendar with ease.",
  },
  {
    icon: Users,
    title: "Client Management",
    description:
      "Manage multiple clients in one place. Each client gets their own workspace with platform integrations.",
  },
  {
    icon: Shield,
    title: "Secure Integration",
    description:
      "Connect social media accounts with OAuth. Your credentials are encrypted and never exposed.",
  },
];

const stats = [
  { value: "5+", label: "Platforms" },
  { value: "100%", label: "Approval Control" },
  { value: "24/7", label: "Scheduling" },
  { value: "1", label: "Dashboard" },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Social Media Connective" className="size-8" />
            <div>
              <p className="text-sm font-semibold tracking-tight">Social Media Connective</p>
              <p className="text-[11px] text-muted-foreground">Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">
                Get Started
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.02]" />
        <div className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Zap className="size-3.5" />
              Marketing Content Management
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Manage all your marketing content{" "}
              <span className="text-primary">in one place</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Create, review, and approve social media content across every platform.
              Simple, organized, and built for professional marketing teams.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link to="/auth">
                  Start Managing Content
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">Sign In to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-12 sm:px-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to manage content
          </h2>
          <p className="mt-4 text-muted-foreground">
            A focused dashboard designed for marketing teams who need to create, organize, and
            approve content efficiently.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border bg-card p-6 shadow-soft transition-all hover:shadow-md"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="size-5 text-primary" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple workflow, powerful results
            </h2>
            <p className="mt-4 text-muted-foreground">
              From content creation to approval, every step is designed to be intuitive.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-4">
            {[
              { step: "01", title: "Create", desc: "Generate or import marketing content for any platform." },
              { step: "02", title: "Review", desc: "Preview content with details, captions, and hashtags." },
              { step: "03", title: "Submit", desc: "Send content through the approval pipeline." },
              { step: "04", title: "Approve", desc: "Final approval and schedule for publishing." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="rounded-2xl bg-primary px-8 py-16 text-center sm:px-16">
          <BarChart3 className="mx-auto size-10 text-primary-foreground/80" />
          <h2 className="mt-6 text-2xl font-bold text-primary-foreground sm:text-3xl">
            Ready to streamline your content?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
            Join marketing teams who use Social Media Connective to manage their content
            efficiently. Get started in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="bg-white text-primary hover:bg-white/90"
            >
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Social Media Connective" className="size-6" />
            <span className="text-sm font-medium">Social Media Connective</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Simple. Organized. Professional. Content-focused.
          </p>
        </div>
      </footer>
    </div>
  );
}
