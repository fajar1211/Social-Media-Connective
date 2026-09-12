import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Bot,
  Megaphone,
  BarChart3,
  Zap,
  ShieldCheck,
  Users,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChatConnect Pro — AI Automation untuk Social Media" },
      {
        name: "description",
        content:
          "Otomatiskan social media Anda dengan AI bot, broadcast cerdas, dan analytics real-time. Satu dashboard untuk semua platform.",
      },
      { property: "og:title", content: "ChatConnect Pro — AI Social Media Automation" },
      { property: "og:description", content: "Otomatisasi social media untuk bisnis modern." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Logos />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-soft">
            <Bot className="h-5 w-5" />
          </div>
          <span className="font-bold tracking-tight">ChatConnect Pro</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">Fitur</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Harga</a>
          <a href="#contact" className="hover:text-foreground transition-colors">Kontak</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="rounded-lg">
            <Link to="/login">Masuk</Link>
          </Button>
          <Button asChild size="sm" className="rounded-lg shadow-soft">
            <Link to="/signup">Daftar Gratis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary mb-6 gap-1.5">
            <Bot className="h-3 w-3" /> ChatConnect Pro · Multi-Platform AI
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            Otomatiskan Semua{" "}
            <span className="bg-gradient-brand bg-clip-text text-transparent">Social Media Anda</span>
            {" "}dengan AI
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Bot pintar, broadcast terjadwal, dan analytics real-time untuk WhatsApp, Instagram, Telegram, dan lainnya — dalam satu dashboard.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-xl px-6 shadow-soft transition-transform hover:scale-[1.02]">
              <Link to="/signup">Mulai Gratis <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6">
              <Link to="/login">Masuk ke Dashboard</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Tanpa kartu kredit · Setup 5 menit</p>
        </motion.div>

        {/* Mock dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <div className="rounded-2xl border bg-card p-2 shadow-soft">
            <div className="rounded-xl bg-muted/40 p-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { l: "Status", v: "Online", c: "text-success" },
                  { l: "Pesan", v: "1,284", c: "" },
                  { l: "Aktif", v: "47", c: "" },
                  { l: "AI Reply", v: "92%", c: "text-primary" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border bg-card p-3 text-left shadow-sm">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
                    <p className={`mt-1 text-xl font-bold ${s.c}`}>{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-32 rounded-xl border bg-gradient-to-br from-primary/5 to-secondary/5" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Logos() {
  const logos = ["Tokopedia", "Shopee", "Gojek", "Traveloka", "Bukalapak", "Blibli"];
  return (
    <section className="border-y bg-muted/30 py-10">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <p className="text-center text-xs uppercase tracking-wider text-muted-foreground">
          Dipercaya oleh tim modern di seluruh Indonesia
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
          {logos.map((l) => (
            <span key={l} className="text-sm font-semibold tracking-wide text-muted-foreground">{l}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: Bot, t: "AI Auto-Reply", d: "Balas otomatis 24/7 di semua platform dengan AI yang belajar dari knowledge base Anda." },
  { icon: Megaphone, t: "Broadcast Cerdas", d: "Kirim pesan tertarget ke ribuan kontak di WhatsApp, Instagram, dan lainnya." },
  { icon: BarChart3, t: "Analytics Real-time", d: "Lacak performa pesan, response rate, dan konversi dalam satu tampilan." },
  { icon: Users, t: "Multi-Agent", d: "Tim CS dapat berkolaborasi menangani percakapan dari satu inbox terpadu." },
  { icon: Zap, t: "Integrasi Mudah", d: "Hubungkan dengan CRM, e-commerce, dan tools favorit Anda dalam hitungan klik." },
  { icon: ShieldCheck, t: "Aman & Terpercaya", d: "Keamanan enterprise dengan enkripsi dan kontrol akses tim yang ketat." },
];

function Features() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="rounded-full mb-4">Fitur</Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Semua yang Anda butuhkan untuk skala social media
          </h2>
          <p className="mt-4 text-muted-foreground">
            Dari otomatisasi sampai analytics — dirancang untuk tim yang bergerak cepat.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-semibold tracking-tight">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const plans = [
  { name: "Starter", price: "Gratis", desc: "Untuk eksplorasi & tim kecil.", features: ["1 social channel", "100 interaksi/bulan", "AI dasar", "Email support"], cta: "Mulai", highlight: false },
  { name: "Growth", price: "Rp 299rb", desc: "Untuk bisnis berkembang.", features: ["3 social channels", "10.000 interaksi/bulan", "AI lanjutan + Broadcast", "Multi-agent (5 user)", "Priority support"], cta: "Pilih Growth", highlight: true },
  { name: "Scale", price: "Custom", desc: "Untuk enterprise.", features: ["Channel unlimited", "Volume custom", "API & webhook", "Dedicated manager", "SLA 99.9%"], cta: "Hubungi Kami", highlight: false },
];

function Pricing() {
  return (
    <section id="pricing" className="border-t bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="rounded-full mb-4">Harga</Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Harga sederhana, transparan
          </h2>
          <p className="mt-4 text-muted-foreground">Bayar sesuai kebutuhan. Upgrade kapan saja.</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 ${
                p.highlight ? "border-primary ring-2 ring-primary/20" : ""
              }`}
            >
              {p.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-brand text-white border-0">
                  Paling Populer
                </Badge>
              )}
              <h3 className="font-bold tracking-tight">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                {p.price !== "Custom" && p.price !== "Gratis" && (
                  <span className="text-sm text-muted-foreground">/bulan</span>
                )}
              </div>
              <Button
                asChild
                className={`mt-6 w-full rounded-xl ${p.highlight ? "" : ""}`}
                variant={p.highlight ? "default" : "outline"}
              >
                <Link to="/signup">{p.cta}</Link>
              </Button>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 text-success mt-0.5" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="contact" className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 text-center text-white shadow-soft md:p-16">
          <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full bg-white/10 blur-3xl animate-float-slow" />
          <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-white/10 blur-3xl animate-float-slow" style={{ animationDelay: "3s" }} />
          <h2 className="relative text-3xl font-bold tracking-tight md:text-4xl">
            Siap otomatiskan social media bisnis Anda?
          </h2>
          <p className="relative mt-3 text-white/85">
            Bergabung dengan ribuan tim yang sudah mengotomatiskan komunikasi mereka.
          </p>
          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="h-12 rounded-xl bg-white text-primary hover:bg-white/90 px-6">
              <Link to="/signup">Daftar Gratis Sekarang</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white px-6">
              <Link to="/login">Masuk</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand text-white">
            <Bot className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">ChatConnect Pro</span>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 ChatConnect Pro. All rights reserved.</p>
      </div>
    </footer>
  );
}
