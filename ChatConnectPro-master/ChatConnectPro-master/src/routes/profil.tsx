import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { motion } from "framer-motion";
import { checkAuth, getAuthUser, getProfile, updateProfile, updateDisplayName, uploadLogo, type ProfileData, type AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Save, Upload, Building2, User, MapPin, Image } from "lucide-react";

export const Route = createFileRoute("/profil")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Profil — ChatConnect Pro" },
      { name: "description", content: "Profil perusahaan ChatConnect Pro." },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const user = getAuthUser();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <AppHeader />
          <div className="flex-1 overflow-y-auto p-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
              <LogoSection user={user} />
              <BisnisSection user={user} />
              <KontakSection user={user} />
            </motion.div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function LogoSection({ user }: { user: AuthUser | null }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.logo_url) setLogoUrl(p.logo_url);
    }).catch(() => {});
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran maksimal 2MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadLogo(file);
      await updateProfile({ logo_url: url });
      setLogoUrl(url);
      toast.success("Logo berhasil diupload");
    } catch (e: any) {
      toast.error("Gagal upload logo", { description: e.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" /> Logo Perusahaan</CardTitle>
        <CardDescription>Upload logo bisnis Anda (maks. 2MB)</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <Avatar className="h-24 w-24 rounded-xl border-2 border-border">
          {logoUrl ? (
            <AvatarImage src={logoUrl} alt="Logo" className="object-cover" />
          ) : (
            <AvatarFallback className="rounded-xl bg-muted text-muted-foreground">
              <Building2 className="h-10 w-10" />
            </AvatarFallback>
          )}
        </Avatar>
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {logoUrl ? "Ganti Logo" : "Upload Logo"}
          </Button>
          {logoUrl && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
              await updateProfile({ logo_url: null }).catch(() => {});
              setLogoUrl(null);
              toast.success("Logo dihapus");
            }}>
              Hapus
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BisnisSection({ user }: { user: AuthUser | null }) {
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.business_name) setBusinessName(p.business_name);
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (!businessName.trim() || !ownerName.trim()) {
      toast.error("Nama bisnis dan pemilik wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ business_name: businessName.trim() });
      await updateDisplayName(ownerName.trim());
      toast.success("Profil bisnis disimpan");
    } catch (e: any) {
      toast.error("Gagal menyimpan", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Informasi Bisnis</CardTitle>
        <CardDescription>Data perusahaan atau usaha Anda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="business-name">Nama Bisnis</Label>
          <Input id="business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Nama perusahaan / toko / usaha" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="owner-name">Nama Pemilik / PIC</Label>
          <Input id="owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nama lengkap pemilik" />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Simpan
        </Button>
      </CardContent>
    </Card>
  );
}

function KontakSection({ user }: { user: AuthUser | null }) {
  const [phone, setPhone] = useState("");
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.phone) setPhone(p.phone);
      if (p?.additional_email) setAdditionalEmail(p.additional_email);
      if (p?.address) setAddress(p.address);
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({
        phone: phone.trim() || null,
        additional_email: additionalEmail.trim() || null,
        address: address.trim() || null,
      });
      toast.success("Kontak disimpan");
    } catch (e: any) {
      toast.error("Gagal menyimpan", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Kontak & Alamat</CardTitle>
        <CardDescription>Informasi kontak dan alamat bisnis Anda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Email Utama (Akun Login)</Label>
          <Input value={user?.email || ""} disabled className="bg-muted/50" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="additional-email">Email Lainnya</Label>
          <Input id="additional-email" type="email" value={additionalEmail} onChange={(e) => setAdditionalEmail(e.target.value)} placeholder="Email tambahan (opsional)" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Nomor Telp</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nomor telepon yang bisa dihubungi" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="address">Alamat Lengkap</Label>
          <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap bisnis Anda" rows={3} />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Simpan
        </Button>
      </CardContent>
    </Card>
  );
}
