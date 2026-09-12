import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bot, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk — ChatConnect Pro" },
      { name: "description", content: "Login ke panel admin ChatConnect Pro." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pw) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email, pw);
      toast.success("Berhasil masuk", { description: "Selamat datang kembali!" });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error("Login gagal", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Redirect happens, no need to navigate
    } catch (err: any) {
      toast.error("Gagal login dengan Google", { description: err.message });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* LEFT */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-gradient-brand">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float-slow" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float-slow" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-2xl bg-white/5 rotate-12 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link to="/" className="flex items-center gap-2 font-semibold w-fit">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur">
              <Bot className="h-5 w-5" />
            </div>
            <span>ChatConnect Pro</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md"
          >
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-xl shadow-2xl">
              <Bot className="h-10 w-10" />
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              ChatConnect Pro
            </h1>
            <p className="mt-4 text-xl text-white/85">Social Media AI Automation</p>
            <p className="mt-6 text-sm text-white/70 max-w-sm">
              Kelola percakapan, broadcast, dan AI bot untuk semua social media Anda dalam satu dashboard.
            </p>
          </motion.div>

          <p className="text-xs text-white/60">© 2026 ChatConnect Pro</p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px]"
        >
          <div className="rounded-2xl border bg-card p-8 shadow-soft">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
              <p className="mt-1 text-sm text-muted-foreground">Login untuk melanjutkan</p>
            </div>

            <Button
              variant="outline"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="h-11 w-full rounded-xl gap-3 font-medium"
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
              {googleLoading ? "Memproses..." : "Lanjutkan dengan Google"}
            </Button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">atau</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" className="pl-9 h-11 rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} required placeholder="••••••••" className="pl-9 pr-9 h-11 rounded-xl" />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl text-base font-semibold shadow-soft transition-transform hover:scale-[1.01]"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</>
                ) : "Masuk"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">Daftar</Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © 2026 ChatConnect Pro
          </p>

          <div className="mt-4 text-center">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Kembali ke beranda
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
