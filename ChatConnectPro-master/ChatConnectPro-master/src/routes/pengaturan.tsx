import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { motion } from "framer-motion";
import { checkAuth, getAuthUser, updateDisplayName, updatePassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Key, User } from "lucide-react";

export const Route = createFileRoute("/pengaturan")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Pengaturan — ChatConnect Pro" },
      { name: "description", content: "Pengaturan akun ChatConnect Pro." },
    ],
  }),
  component: PengaturanPage,
});

function PengaturanPage() {
  const user = getAuthUser();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <AppHeader />
          <div className="flex-1 overflow-y-auto p-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
              <NameSection user={user} />
              <PasswordSection />
            </motion.div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function NameSection({ user }: { user: ReturnType<typeof getAuthUser> }) {
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Nama tidak boleh kosong"); return }
    setSaving(true);
    try {
      await updateDisplayName(name.trim());
      toast.success("Nama berhasil diubah");
    } catch (e: any) {
      toast.error("Gagal mengubah nama", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Nama Pengguna</CardTitle>
        <CardDescription>Ubah nama tampilan akun Anda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="name">Nama</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Anda" />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Simpan
        </Button>
      </CardContent>
    </Card>
  );
}

function PasswordSection() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!newPassword || !confirmPassword) { toast.error("Semua field wajib diisi"); return }
    if (newPassword.length < 6) { toast.error("Password minimal 6 karakter"); return }
    if (newPassword !== confirmPassword) { toast.error("Password tidak cocok"); return }
    setSaving(true);
    try {
      await updatePassword(newPassword);
      toast.success("Password berhasil diubah");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error("Gagal mengubah password", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Password</CardTitle>
        <CardDescription>Ubah password login akun Anda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="new-password">Password Baru</Label>
          <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm-password">Konfirmasi Password</Label>
          <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Ubah Password
        </Button>
      </CardContent>
    </Card>
  );
}
