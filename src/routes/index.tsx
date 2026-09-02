import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FileText,
  CheckCircle2,
  Calendar,
  Shield,
  Zap,
  Users,
  Sparkles,
  Globe,
  Send,
  BarChart3,
  Share2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Social Media Connective — All-in-One Marketing Platform" },
      {
        name: "description",
        content:
          "Create, schedule, and publish marketing content across all social media platforms from one powerful dashboard.",
      },
    ],
  }),
  component: LandingPage,
});

/* ───────── Animated Counter ───────── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const duration = 2000;
          const step = (ts: number) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-4xl font-bold text-primary sm:text-5xl tabular-nums">
      {count}
      {suffix}
    </div>
  );
}

/* ───────── Fade In on Scroll ───────── */
function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ───────── Platform Data ───────── */
const platforms = [
  {
    name: "Facebook",
    color: "bg-[#1877F2]",
    icon: (
      <svg className="size-7 fill-white" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    color: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
    icon: (
      <svg className="size-7 fill-white" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    name: "X / Twitter",
    color: "bg-[#000000]",
    icon: (
      <svg className="size-7 fill-white" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    color: "bg-[#0A66C2]",
    icon: (
      <svg className="size-7 fill-white" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    color: "bg-[#FF0000]",
    icon: (
      <svg className="size-7 fill-white" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    color: "bg-[#000000]",
    icon: (
      <svg className="size-7 fill-white" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.16 8.16 0 005.58 2.18V12a4.85 4.85 0 01-3.58-1.48V6.69h3.58z" />
      </svg>
    ),
  },
  {
    name: "Threads",
    color: "bg-[#000000]",
    icon: (
      <svg className="size-7 fill-white" viewBox="0 0 24 24">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.813-1.79-.128 2.754-1.19 5.072-3.988 5.072-.037 0-.075 0-.112-.002-2.92-.105-4.944-1.548-5.042-4.01a4.18 4.18 0 0 1 1.772-3.557c1.032-.815 2.364-1.232 3.736-1.172 2.028.09 3.708.976 4.814 2.534l1.83-1.15c-1.438-2.093-3.616-3.31-6.35-3.424-.86-.036-1.695.06-2.481.286a6.18 6.18 0 0 0-3.56 2.634 6.248 6.248 0 0 0-.657 4.867c.42 1.59 1.468 2.86 2.954 3.623 1.28.662 2.765.967 4.284.897.067.364.103.74.103 1.124 0 .394-.038.782-.113 1.162-.24 1.213-.82 2.263-1.68 3.037-1.098.986-2.57 1.53-4.45 1.644zm3.144-7.844c-.03.276-.11.525-.242.746-.31.514-.849.76-1.617.76-.094 0-.19-.004-.286-.012-.314-.027-.635-.088-.962-.184 0 0-.012-.004-.012-.01a.338.338 0 0 1-.02-.118c.028-2.636 1.942-4.322 5.006-4.322.048 0 .096.002.144.004-.974.544-1.682 1.462-2.01 2.138z" />
      </svg>
    ),
  },
  {
    name: "Reddit",
    color: "bg-[#FF4500]",
    icon: (
      <svg className="size-7 fill-white" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  {
    name: "Blog",
    color: "bg-[#21759B]",
    icon: (
      <svg className="size-7 fill-white" viewBox="0 0 24 24">
        <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.009 12c0-1.298.283-2.532.784-3.648L7.694 19.09A8.013 8.013 0 013.009 12zm8.991 9c-.962 0-1.896-.14-2.785-.401l2.965-8.64 3.042 8.345a.588.588 0 00.046.093A7.987 7.987 0 0112 21zm1.251-13.368l-3.468 10.114a.532.532 0 01-.031.078 7.955 7.955 0 01-2.245-5.435c0-3.309 2.577-6.037 5.812-6.32l-.068 1.563zm5.037-1.611L13.338 18.8a7.96 7.96 0 012.377.238c.339-.825.53-1.726.53-2.675 0-2.421-1.318-4.536-3.281-5.673l-.031-.042z" />
      </svg>
    ),
  },
];

const features = [
  {
    icon: Sparkles,
    title: "AI Content Creation",
    description:
      "Generate engaging posts with AI. Tailored tone, style, and hashtags for every platform.",
    gradient: "from-violet-500/10 to-purple-500/10",
  },
  {
    icon: Globe,
    title: "Multi-Platform Publishing",
    description:
      "One click to publish across Facebook, Instagram, X, LinkedIn, TikTok, and more.",
    gradient: "from-blue-500/10 to-cyan-500/10",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description:
      "Plan your content calendar. Schedule posts at optimal times for maximum reach.",
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  {
    icon: CheckCircle2,
    title: "Approval Workflow",
    description:
      "Review, approve, and manage content with a streamlined pipeline. Never miss a post.",
    gradient: "from-emerald-500/10 to-green-500/10",
  },
  {
    icon: Users,
    title: "Multi-Client Management",
    description:
      "Manage multiple brands from one dashboard. Each client gets their own workspace.",
    gradient: "from-pink-500/10 to-rose-500/10",
  },
  {
    icon: Shield,
    title: "Secure OAuth Connect",
    description:
      "Connect accounts with official OAuth. Your credentials stay safe and encrypted.",
    gradient: "from-teal-500/10 to-emerald-500/10",
  },
];

const workflow = [
  { step: "01", title: "Create", desc: "Write or generate content with AI assistance", icon: Sparkles },
  { step: "02", title: "Preview", desc: "See how it looks on each platform before posting", icon: FileText },
  { step: "03", title: "Schedule", desc: "Set the perfect time or publish immediately", icon: Calendar },
  { step: "04", title: "Publish", desc: "Go live across all platforms with one click", icon: Send },
];

/* ═══════════════════════ LANDING PAGE ═══════════════════════ */
function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative">
              <img src="/logo.png" alt="Social Media Connective" className="size-8" />
              <div className="absolute -inset-1 rounded-full bg-primary/20 blur-md -z-10" />
            </div>
            <span className="text-sm font-bold tracking-tight">Social Media Connective</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
              <Link to="/auth">
                Get Started
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16">
        {/* Animated gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-background to-primary/[0.03]" />
          <div className="hero-orb hero-orb-1 absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/[0.07] blur-[120px]" />
          <div className="hero-orb hero-orb-2 absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-purple-500/[0.06] blur-[100px]" />
          <div className="hero-orb hero-orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-blue-500/[0.04] blur-[80px]" />
          {/* Dot grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pt-24 pb-20 sm:px-8 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36">
          {/* Badge */}
          <FadeIn className="flex justify-center">
            <div className="hero-badge group relative mb-8 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-5 py-2 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Social Media Management Platform
              <ChevronRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
            </div>
          </FadeIn>

          {/* Heading */}
          <FadeIn delay={0.1}>
            <h1 className="mx-auto max-w-4xl text-center text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
              Your content, <br className="hidden sm:block" />
              <span className="hero-gradient-text relative inline-block">
                everywhere
                <svg
                  className="hero-underline absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                >
                  <path
                    d="M2 8 C50 2, 150 2, 198 8"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-primary/40"
                  />
                </svg>
              </span>
            </h1>
          </FadeIn>

          {/* Subheading */}
          <FadeIn delay={0.2}>
            <p className="mx-auto mt-7 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Create, schedule, and publish marketing content across all social media platforms
              from one powerful dashboard.
            </p>
          </FadeIn>

          {/* CTA Buttons */}
          <FadeIn delay={0.3}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                asChild
                className="group relative px-8 text-base font-semibold shadow-xl shadow-primary/20 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                <Link to="/auth">
                  Start for Free
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                asChild
                className="px-8 text-base font-semibold"
              >
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </FadeIn>

          {/* Floating Platform Icons in Hero */}
          <FadeIn delay={0.4}>
            <div className="hero-floating-icons relative mx-auto mt-20 max-w-3xl">
              {/* Central dashboard preview */}
              <div className="hero-dashboard-card relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-1 shadow-2xl shadow-primary/10 backdrop-blur-xl">
                <div className="rounded-xl bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex gap-1.5">
                      <div className="size-3 rounded-full bg-red-400" />
                      <div className="size-3 rounded-full bg-amber-400" />
                      <div className="size-3 rounded-full bg-green-400" />
                    </div>
                    <div className="h-2 flex-1 rounded-full bg-muted" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="rounded-lg bg-primary/10 p-3 text-center">
                      <p className="text-2xl font-bold text-primary">24</p>
                      <p className="text-[10px] font-medium text-muted-foreground">Posts</p>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">12</p>
                      <p className="text-[10px] font-medium text-muted-foreground">Approved</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                      <p className="text-2xl font-bold text-amber-600">5</p>
                      <p className="text-[10px] font-medium text-muted-foreground">Scheduled</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-white/60 p-3">
                        <div className="size-8 rounded-md bg-primary/10" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2 w-3/4 rounded-full bg-muted" />
                          <div className="h-1.5 w-1/2 rounded-full bg-muted/60" />
                        </div>
                        <div className="size-6 rounded-full bg-primary/10" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating platform badges */}
              {[
                { platform: platforms[0], pos: "hero-float-1", delay: "0s" },
                { platform: platforms[1], pos: "hero-float-2", delay: "1s" },
                { platform: platforms[3], pos: "hero-float-3", delay: "2s" },
                { platform: platforms[4], pos: "hero-float-4", delay: "0.5s" },
                { platform: platforms[5], pos: "hero-float-5", delay: "1.5s" },
                { platform: platforms[8], pos: "hero-float-6", delay: "2.5s" },
              ].map(({ platform, pos, delay }) => (
                <div
                  key={platform.name}
                  className={`hero-float-badge ${pos} absolute hidden items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md sm:flex`}
                  style={{ animationDelay: delay }}
                >
                  <div className={`flex size-7 items-center justify-center rounded-lg ${platform.color}`}>
                    {platform.icon}
                  </div>
                  <span className="text-xs font-semibold">{platform.name}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Marquee Platform Logos ── */}
      <section className="relative border-y bg-muted/20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-10">
            Supported Platforms
          </p>
          <div className="relative">
            {/* Fade edges */}
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-muted/20 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-muted/20 to-transparent" />
            {/* Marquee */}
            <div className="flex w-max animate-marquee gap-4">
              {[...platforms, ...platforms].map((platform, i) => (
                <div
                  key={`${platform.name}-${i}`}
                  className="group flex items-center gap-2.5 rounded-xl border bg-card px-4 py-2.5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20"
                >
                  <div className={`flex size-8 items-center justify-center rounded-lg ${platform.color}`}>
                    {platform.icon}
                  </div>
                  <span className="text-sm font-medium">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">Features</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Everything you need to scale
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Powerful tools designed for marketing teams who want to move fast and stay organized.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 0.08}>
              <div className="group relative overflow-hidden rounded-2xl border bg-card p-7 transition-all duration-500 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative">
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-500 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/20">
                    <feature.icon className="size-5 text-primary transition-colors duration-500 group-hover:text-white" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Workflow ── */}
      <section className="relative border-t bg-muted/20 overflow-hidden">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">How It Works</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                From idea to publish in minutes
              </h2>
              <p className="mt-5 text-lg text-muted-foreground">
                A simple four-step workflow that keeps your content pipeline flowing.
              </p>
            </div>
          </FadeIn>

          <div className="mt-16 grid gap-6 md:grid-cols-4">
            {workflow.map((item, i) => (
              <FadeIn key={item.step} delay={i * 0.12}>
                <div className="group relative text-center">
                  {i < workflow.length - 1 && (
                    <div className="absolute left-[calc(50%+36px)] top-7 hidden h-px w-[calc(100%-72px)] bg-gradient-to-r from-primary/30 to-primary/10 md:block" />
                  )}
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-primary/30">
                    <item.icon className="size-6" />
                  </div>
                  <h3 className="mt-6 font-semibold text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative border-t">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 py-20 sm:px-8 md:grid-cols-4">
          {[
            { value: 9, suffix: "+", label: "Platforms", icon: Share2 },
            { value: 100, suffix: "%", label: "Approval Control", icon: CheckCircle2 },
            { value: 24, suffix: "/7", label: "Scheduling", icon: Clock },
            { value: 0, suffix: "$", label: "To Start", icon: Zap },
          ].map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.1}>
              <div className="group text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/20">
                  <stat.icon className="size-5 text-primary transition-colors group-hover:text-white" />
                </div>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                <p className="mt-2 text-sm font-medium text-muted-foreground">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <BarChart3 className="size-6 text-primary" />
              </div>
              <blockquote className="text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
                "Social Media Connective transformed how our agency manages content for 20+ clients.
                    What used to take hours now takes minutes."
              </blockquote>
              <div className="mt-8 flex items-center justify-center gap-4">
                <div className="size-12 rounded-full bg-gradient-to-br from-primary to-primary/60" />
                <div className="text-left">
                  <p className="font-semibold">Marketing Team</p>
                  <p className="text-sm text-muted-foreground">Creative Agency</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <FadeIn>
          <div className="cta-card relative overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-16">
            {/* Animated gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-purple-600" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]" />
            {/* Animated dots */}
            <div className="cta-dots absolute inset-0 opacity-10" />
            <div className="relative">
              <Send className="mx-auto size-10 text-white/80" />
              <h2 className="mt-6 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Ready to amplify your reach?
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-lg text-white/80">
                Join thousands of marketing teams who trust Social Media Connective
                to manage their content across every platform.
              </p>
              <div className="mt-10">
                <Button
                  size="lg"
                  asChild
                  className="group bg-white text-primary hover:bg-white/90 px-10 text-base font-semibold shadow-xl transition-all hover:shadow-2xl hover:-translate-y-0.5"
                >
                  <Link to="/auth">
                    Get Started Free
                    <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Social Media Connective" className="size-6" />
            <span className="text-sm font-semibold">Social Media Connective</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Simple. Powerful. Multi-platform.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* Clock icon component for stats */
function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
