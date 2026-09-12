import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bot, Mail, Lock, Eye, EyeOff, User, ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { signUpWithEmail, signInWithEmail } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Daftar — ChatConnect Pro" },
      { name: "description", content: "Buat akun gratis ChatConnect Pro." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [agree, setAgree] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      toast.error("Harap setujui syarat & ketentuan");
      return;
    }
    if (pw.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(name, email, pw);
      toast.success("Akun berhasil dibuat", {
        description: "Silakan cek email untuk verifikasi, lalu login.",
      });
      // Auto login after signup
      try {
        await signInWithEmail(email, pw);
        navigate({ to: "/dashboard" });
        return;
      } catch {
        // If auto-login fails (email verification required), go to login
      }
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error("Gagal daftar", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* LEFT */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-gradient-brand">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float-slow" />
        <div className="absolute bottom-10 left-10 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float-slow" style={{ animationDelay: "3s" }} />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link to="/" className="flex items-center gap-2 font-semibold w-fit">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur">
              <Bot className="h-5 w-5" />
            </div>
            <span>ChatConnect Pro</span>
          </Link>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-md">
            <h1 className="text-5xl font-bold leading-tight tracking-tight">Mulai gratis hari ini</h1>
            <p className="mt-4 text-xl text-white/85">Tanpa kartu kredit · Setup 5 menit</p>
            <ul className="mt-8 space-y-3 text-sm text-white/85">
              {["100 interaksi otomatis gratis", "AI auto-reply 24/7", "Dashboard analytics real-time", "Integrasi mudah"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> {f}
                </li>
              ))}
            </ul>
          </motion.div>

          <p className="text-xs text-white/60">© 2026 ChatConnect Pro</p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[420px]">
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </Link>

          <div className="rounded-2xl border bg-card p-8 shadow-soft">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-2xl font-bold tracking-tight">Buat Akun</h2>
              <p className="mt-1 text-sm text-muted-foreground">Daftar gratis dalam hitungan detik</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" className="pl-9 h-11 rounded-xl" />
                </div>
              </div>

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
                  <Input id="password" type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} required placeholder="Min. 6 karakter" className="pl-9 pr-9 h-11 rounded-xl" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
                <span className="text-muted-foreground leading-snug">
                  Saya setuju dengan{" "}
                  <a href="#" className="text-primary hover:underline">Syarat & Ketentuan</a> dan{" "}
                  <a href="#" className="text-primary hover:underline">Kebijakan Privasi</a>.
                </span>
              </label>

              <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-base font-semibold shadow-soft transition-transform hover:scale-[1.01]">
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Membuat akun...</>
                ) : "Daftar Sekarang"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">Masuk</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
