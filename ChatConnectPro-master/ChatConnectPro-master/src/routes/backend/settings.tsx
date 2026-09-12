import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { checkAuth, uploadLogo, updateDisplayName, updatePassword, getAuthUser } from "@/lib/auth";
import { api, type AdminUser } from "@/lib/api";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Settings, Upload, User, Lock, Users, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/backend/settings")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/backend/login" });
  },
  head: () => ({
    meta: [
      { title: "Settings — Admin ChatConnect Pro" },
    ],
  }),
  component: BackendSettingsPage,
});

function BackendSettingsPage() {
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [address, setAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userNewPw, setUserNewPw] = useState("");
  const [userConfirmPw, setUserConfirmPw] = useState("");
  const [savingUserPw, setSavingUserPw] = useState(false);
  const [userProfile, setUserProfile] = useState<AdminUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    const user = getAuthUser();
    if (user) setDisplayName(user.name || "");
    api.getProfile()
      .then((p) => {
        setProfile(p);
        setBusinessName(p.business_name || "");
        setPhone(p.phone || "");
        setAdditionalEmail(p.additional_email || "");
        setAddress(p.address || "");
      })
      .catch(() => toast.error("Gagal memuat profil"))
      .finally(() => setLoading(false));
    api.getAdminUsers().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setUserProfile(null);
      return;
    }
    setLoadingUser(true);
    api.getUserProfile(selectedUserId)
      .then((p) => setUserProfile(p))
      .catch(() => toast.error("Gagal memuat profil user"))
      .finally(() => setLoadingUser(false));
  }, [selectedUserId]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        business_name: businessName || null,
        phone: phone || null,
        additional_email: additionalEmail || null,
        address: address || null,
      });
      setProfile(updated);
      toast.success("Profil tersimpan");
    } catch (e: any) {
      toast.error("Gagal simpan", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) { toast.error("Nama tidak boleh kosong"); return; }
    setSavingName(true);
    try {
      await updateDisplayName(displayName.trim());
      toast.success("Nama berhasil diubah");
    } catch (e: any) {
      toast.error("Gagal ubah nama", { description: e.message });
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPw || !newPw) { toast.error("Password saat ini dan baru wajib diisi"); return; }
    if (newPw.length < 6) { toast.error("Password baru minimal 6 karakter"); return; }
    if (newPw !== confirmPw) { toast.error("Konfirmasi password tidak cocok"); return; }
    setSavingPw(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const user = getAuthUser();
      if (!user?.email) throw new Error("Email tidak ditemukan");
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (signInError || !data.session) throw new Error("Password saat ini salah");
      await updatePassword(newPw);
      toast.success("Password berhasil diubah");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e: any) {
      toast.error("Gagal ubah password", { description: e.message });
    } finally {
      setSavingPw(false);
    }
  };

  const handleResetUserPassword = async () => {
    if (!selectedUserId) { toast.error("Pilih user terlebih dahulu"); return; }
    if (!userNewPw || userNewPw.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    if (userNewPw !== userConfirmPw) { toast.error("Konfirmasi password tidak cocok"); return; }
    setSavingUserPw(true);
    try {
      await api.resetUserPassword(selectedUserId, userNewPw);
      const selectedUser = users.find((u) => u.id === selectedUserId);
      toast.success(`Password untuk ${selectedUser?.name || selectedUser?.email || "user"} berhasil diubah`);
      setUserNewPw(""); setUserConfirmPw("");
    } catch (e: any) {
      toast.error("Gagal reset password", { description: e.message });
    } finally {
      setSavingUserPw(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-sm text-muted-foreground mt-1">Pengaturan akun admin dan data user</p>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ─── KOLOM KIRI: ADMIN ─── */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold tracking-tight">Pengaturan Akun Admin</span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" /> Akun Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Tampilan</Label>
                  <div className="flex gap-2">
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nama Anda" className="h-9 flex-1" />
                    <Button onClick={handleSaveName} disabled={savingName} className="rounded-lg shrink-0">
                      {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4" /> Ubah Password Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPw">Password Saat Ini</Label>
                  <Input id="currentPw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPw">Password Baru</Label>
                  <Input id="newPw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 6 karakter" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPw">Konfirmasi Password Baru</Label>
                  <Input id="confirmPw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Ulangi password baru" className="h-9" />
                </div>
                <Button onClick={handleSavePassword} disabled={savingPw} className="rounded-xl">
                  {savingPw ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : "Ubah Password"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ─── KOLOM KANAN: USER ─── */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold tracking-tight">Pengaturan Data User</span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" /> Pilih User & Reset Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pilih User</Label>
                  <Select value={selectedUserId || "all"} onValueChange={(v) => setSelectedUserId(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9 rounded-lg">
                      <SelectValue placeholder="Pilih user..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Pilih user...</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedUserId && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="userNewPw">Password Baru</Label>
                      <Input id="userNewPw" type="password" value={userNewPw} onChange={(e) => setUserNewPw(e.target.value)} placeholder="Min. 6 karakter" className="h-9" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userConfirmPw">Konfirmasi Password Baru</Label>
                      <Input id="userConfirmPw" type="password" value={userConfirmPw} onChange={(e) => setUserConfirmPw(e.target.value)} placeholder="Ulangi password baru" className="h-9" />
                    </div>
                    <Button onClick={handleResetUserPassword} disabled={savingUserPw || !selectedUserId} className="rounded-xl">
                      {savingUserPw ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : "Reset Password User"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {selectedUserId && (
              <>
                {loadingUser ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : userProfile ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Upload className="h-4 w-4" /> Logo — {userProfile.name || userProfile.email}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {userProfile.logo_url ? (
                          <div className="mb-3">
                            <img src={userProfile.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-cover border" />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Belum ada logo</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Building2 className="h-4 w-4" /> Informasi Bisnis — {userProfile.name || userProfile.email}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Nama Bisnis:</span> <span className="font-medium">{userProfile.business_name || "-"}</span></div>
                          <div><span className="text-muted-foreground">Telepon:</span> <span className="font-medium">{userProfile.phone || "-"}</span></div>
                          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{userProfile.additional_email || userProfile.email || "-"}</span></div>
                          <div><span className="text-muted-foreground">Alamat:</span> <span className="font-medium">{userProfile.address || "-"}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : null}
              </>
            )}
          </div>

        </div>
      </motion.div>
    </AdminLayout>
  );
}
