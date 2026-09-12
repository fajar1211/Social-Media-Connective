import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { signInWithEmail, checkAuth } from "@/lib/auth";

export const Route = createFileRoute("/backend/login")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (authed) throw redirect({ to: "/backend/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Admin Login — ChatConnect Pro" },
      { name: "description", content: "Panel administrasi ChatConnect Pro." },
    ],
  }),
  component: BackendLoginPage,
});

function BackendLoginPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
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
      toast.success("Berhasil masuk", { description: "Selamat datang di panel admin!" });
      navigate({ to: "/backend/dashboard" });
    } catch (err: any) {
      toast.error("Login gagal", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* LEFT */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-2xl bg-white/5 rotate-12 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link to="/" className="flex items-center gap-2 font-semibold w-fit">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur">
              <Shield className="h-5 w-5" />
            </div>
            <span>Admin Panel</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md"
          >
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-xl shadow-2xl border border-white/10">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Panel Administrasi
            </h1>
            <p className="mt-4 text-lg text-white/80">ChatConnect Pro</p>
            <p className="mt-6 text-sm text-white/60 max-w-sm leading-relaxed">
              Kelola user, instance, dan monitoring seluruh sistem dalam satu panel kontrol khusus admin.
            </p>
          </motion.div>

          <p className="text-xs text-white/40">© 2026 ChatConnect Pro — Admin Panel</p>
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
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Admin Login</h2>
              <p className="mt-1 text-sm text-muted-foreground">Masuk ke panel administrasi</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@company.com" className="pl-9 h-11 rounded-xl" />
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
                className="h-11 w-full rounded-xl text-base font-semibold shadow-soft"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</>
                ) : "Masuk ke Panel Admin"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Login sebagai user biasa
              </Link>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              Kembali ke beranda
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
