import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Store,
  Music2,
  Globe,
  Plug,
  Loader2,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  LogOut,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Phone,
  Send,
  MessageSquare,
  PauseCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDesc,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { api, type BotInstance, setActiveInstance } from "@/lib/api";
import QRCode from "qrcode";

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  connected: boolean;
  comingSoon?: boolean;
}

interface SocialCredForm {
  page_id: string;
  access_token: string;
  verify_token: string;
  app_secret?: string;
  ig_user_id?: string;
}

export function IntegrationsPanel() {
  const [instances, setInstances] = useState<BotInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrPolling, setQrPolling] = useState(false);
  const [qrTimeout, setQrTimeout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQrRef = useRef<string | null>(null);

  // Instagram state
  const [igStatus, setIgStatus] = useState<{ configured: boolean; connected: boolean; ig_user_id: string | null } | null>(null);
  const [igDialog, setIgDialog] = useState(false);
  const [igForm, setIgForm] = useState<SocialCredForm>({ page_id: "", access_token: "", verify_token: "", app_secret: "" });

  // Messenger state
  const [msgrStatus, setMsgrStatus] = useState<{ configured: boolean; connected: boolean; page_id: string | null } | null>(null);
  const [msgrDialog, setMsgrDialog] = useState(false);
  const [msgrForm, setMsgrForm] = useState<SocialCredForm>({ page_id: "", access_token: "", verify_token: "", app_secret: "" });

  useEffect(() => {
    loadInstances();
    loadIgStatus();
    loadMsgrStatus();
    const iv = setInterval(() => { loadInstances(); loadIgStatus(); loadMsgrStatus(); }, 10000);
    return () => {
      clearInterval(iv);
      if (qrPollRef.current) clearInterval(qrPollRef.current);
      if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    };
  }, []);



  async function loadInstances() {
    try {
      const data = await api.getInstances();
      setInstances(data);
    } catch {
      // not logged in or error
    } finally {
      setLoading(false);
    }
  }

  function stopQrPolling() {
    if (qrPollRef.current) clearInterval(qrPollRef.current);
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    qrPollRef.current = null;
    qrTimeoutRef.current = null;
    setQrPolling(false);
  }

  async function pollQr(id: string) {
    try {
      const data = await api.getQrCode(id);
      if (data.qr) {
        lastQrRef.current = data.qr;
        setQrTimeout(false);
        const url = await QRCode.toDataURL(data.qr, {
          width: 280,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        setQrImageUrl(url);
      }
      const status = await api.getBotStatus(id);
      if (status.bot === "connected") {
        stopQrPolling();
        setQrInstanceId(null);
        setQrTimeout(false);
        toast.success("WhatsApp terhubung!");
        loadInstances();
      } else if (status.bot === "stopped") {
        // Backend explicitly stopped (e.g., session deleted on phone)
        stopQrPolling();
        setQrInstanceId(null);
        setQrTimeout(false);
        toast.error("Koneksi gagal", { description: "Session WhatsApp terputus. Coba lagi." });
        loadInstances();
      }
    } catch (err: any) {
      console.error("QR polling error:", err);
    }
  }

  function startQrPolling(id: string) {
    setQrPolling(true);
    setQrImageUrl(null);
    setQrTimeout(false);
    lastQrRef.current = null;

    if (qrPollRef.current) clearInterval(qrPollRef.current);
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);

    pollQr(id);
    qrPollRef.current = setInterval(() => pollQr(id), 3000);

    qrTimeoutRef.current = setTimeout(() => {
      // Only show timeout if no QR was ever received
      if (!lastQrRef.current) {
        setQrTimeout(true);
      }
    }, 30000);
  }

  async function handleConnect(instanceId: string) {
    try {
      await api.restartBot(instanceId);

      // Cek apakah langsung connected (reconnect dengan session tersimpan)
      const status = await api.getBotStatus(instanceId);
      if (status.bot === "connected") {
        toast.success("WhatsApp terhubung!");
        loadInstances();
        return;
      }

      // Butuh QR
      setQrInstanceId(instanceId);
      setQrImageUrl(null);
      setQrTimeout(false);
      lastQrRef.current = null;
      startQrPolling(instanceId);
    } catch (err: any) {
      toast.error("Gagal menghubungkan", { description: err.message });
      setQrInstanceId(null);
    }
  }

  async function handleDisconnect(instanceId: string) {
    try {
      await api.logoutBot(instanceId);
      toast.success("WhatsApp terputus");
      loadInstances();
    } catch (err: any) {
      toast.error("Gagal memutuskan", { description: err.message });
    }
  }

  async function handlePause(instanceId: string) {
    try {
      await api.pauseBot(instanceId);
      toast.success("Bot dijeda");
      loadInstances();
    } catch (err: any) {
      toast.error("Gagal menjeda", { description: err.message });
    }
  }

  async function handleResume(instanceId: string) {
    try {
      await api.resumeBot(instanceId);
      toast.success("Bot dilanjutkan");
      loadInstances();
    } catch (err: any) {
      toast.error("Gagal melanjutkan", { description: err.message });
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const { instanceId } = await api.createInstance();
      toast.success("Instance baru dibuat");
      await loadInstances();
      setActiveInstance(instanceId);
    } catch (err: any) {
      toast.error("Gagal membuat instance", { description: err.message });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(instanceId: string) {
    setDeleting(true);
    try {
      await api.deleteInstance(instanceId);
      toast.success("Instance dihapus");
      setConfirmDelete(null);
      await loadInstances();
    } catch (err: any) {
      toast.error("Gagal menghapus", { description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  async function loadIgStatus() {
    try {
      const data = await api.getInstagramStatus();
      setIgStatus(data);
      if (data.configured) {
        setIgForm(prev => ({ ...prev, ig_user_id: data.ig_user_id || "" }));
      }
    } catch {}
  }

  async function loadMsgrStatus() {
    try {
      const data = await api.getMessengerStatus();
      setMsgrStatus(data);
    } catch {}
  }

  async function handleIgConnect() {
    if (!igForm.page_id || !igForm.access_token || !igForm.verify_token) {
      toast.error("Semua field wajib diisi");
      return;
    }
    try {
      const res = await api.connectInstagram({
        page_id: igForm.page_id,
        access_token: igForm.access_token,
        ig_user_id: igForm.ig_user_id || igForm.page_id,
        verify_token: igForm.verify_token,
      });
      if (res.success) {
        toast.success("Instagram berhasil dikonfigurasi");
        setIgDialog(false);
        loadIgStatus();
      }
    } catch (err: any) {
      toast.error("Gagal", { description: err.message });
    }
  }

  async function handleMsgrConnect() {
    if (!msgrForm.page_id || !msgrForm.access_token || !msgrForm.verify_token || !msgrForm.app_secret) {
      toast.error("Semua field wajib diisi");
      return;
    }
    try {
      const res = await api.connectMessenger({
        page_id: msgrForm.page_id,
        access_token: msgrForm.access_token,
        verify_token: msgrForm.verify_token,
        app_secret: msgrForm.app_secret,
      });
      if (res.success) {
        toast.success("Messenger berhasil dikonfigurasi");
        setMsgrDialog(false);
        loadMsgrStatus();
      }
    } catch (err: any) {
      toast.error("Gagal", { description: err.message });
    }
  }

  const platforms: Platform[] = [
    {
      id: "telegram",
      name: "Telegram",
      icon: <Send className="h-6 w-6" />,
      color: "text-sky-500",
      bgColor: "bg-sky-100 dark:bg-sky-900/30",
      connected: false,
      comingSoon: true,
    },
    {
      id: "messenger",
      name: "Messenger",
      icon: <MessageSquare className="h-6 w-6" />,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      connected: false,
      comingSoon: false,
    },
    {
      id: "google-my-business",
      name: "Google My Business",
      icon: <Store className="h-6 w-6" />,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      connected: false,
      comingSoon: true,
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: <FacebookIcon className="h-6 w-6" />,
      color: "text-blue-700",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      connected: false,
      comingSoon: true,
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: <InstagramIcon className="h-6 w-6" />,
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      connected: false,
      comingSoon: false,
    },
    {
      id: "youtube",
      name: "Youtube",
      icon: <YoutubeIcon className="h-6 w-6" />,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      connected: false,
      comingSoon: true,
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: <Music2 className="h-6 w-6" />,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      connected: false,
      comingSoon: true,
    },
    {
      id: "website",
      name: "Website",
      icon: <Globe className="h-6 w-6" />,
      color: "text-slate-600",
      bgColor: "bg-slate-100 dark:bg-slate-800",
      connected: false,
      comingSoon: true,
    },
  ];

  return (
    <Card className="rounded-2xl border shadow-soft overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Plug className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Integrasi Platform</h2>
            <p className="text-sm text-muted-foreground">Hubungkan platform Anda untuk mengelola bisnis dari satu tempat.</p>
          </div>
        </div>
      </div>

      <CardContent className="p-5 pt-0 space-y-4">
        {/* Platform Lainnya */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">Platform Lainnya</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {platforms.map((p) => {
              const isActive = !p.comingSoon;
              const platStatus = p.id === "instagram" ? igStatus : p.id === "messenger" ? msgrStatus : null;
              const isConfigured = platStatus?.configured;
              const isConnected = platStatus?.connected;
              return (
                <div
                  key={p.id}
                  onClick={isActive ? () => {
                    if (p.id === "instagram") setIgDialog(true);
                    if (p.id === "messenger") setMsgrDialog(true);
                  } : undefined}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border bg-card/50 p-3 text-center ${!isActive ? "opacity-60" : "cursor-pointer hover:border-primary/30 transition-colors"}`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.bgColor} ${p.color}`}>
                    {p.icon}
                  </div>
                  <span className="text-[10px] font-medium leading-tight">{p.name}</span>
                  {isActive ? (
                    isConfigured ? (
                      <Badge variant={isConnected ? "default" : "secondary"} className="text-[7px] px-1 py-0 h-3 leading-none whitespace-nowrap">
                        {isConnected ? "Terhubung" : "Terputus"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 leading-none whitespace-nowrap">Konfigurasi</Badge>
                    )
                  ) : (
                    <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3 leading-none">Soon</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* WhatsApp Instances */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              <h3 className="text-sm font-semibold">WhatsApp</h3>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {loading ? "..." : instances.length}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreate}
              disabled={creating}
              className="h-8 gap-1.5 rounded-lg text-xs"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Tambah Nomor
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && instances.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
              <MessageCircle className="h-8 w-8 opacity-40" />
              <p>Belum ada nomor WhatsApp terhubung</p>
              <Button size="sm" variant="secondary" onClick={handleCreate} disabled={creating} className="mt-1">
                Tambah Nomor Baru
              </Button>
            </div>
          )}

          <AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {instances.map((inst, i) => {
                const isConnected = inst.status === "connected";
                const isInitializing = inst.status === "initializing";
                const isPaused = inst.status === "paused";
                const isActive = isConnected || isPaused;
                return (
                  <motion.div
                    key={inst.instance_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    layout
                    className="relative group rounded-xl border-2 bg-card p-4 transition-all hover:shadow-soft"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isConnected
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                            : isPaused
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                            : isInitializing
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {isConnected ? (
                            <Wifi className="h-5 w-5" />
                          ) : isPaused ? (
                            <PauseCircle className="h-5 w-5" />
                          ) : isInitializing ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <WifiOff className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                            {inst.phone || "Belum terhubung"}
                            {isConnected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            )}
                            {isPaused && (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate font-mono">
                            {inst.instance_id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(inst.instance_id); }}
                        className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                        title="Hapus instance"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${
                          isConnected
                            ? "border-green-500/30 text-green-600 bg-green-50 dark:bg-green-950"
                            : isPaused
                            ? "border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-950"
                            : isInitializing
                            ? "border-yellow-500/30 text-yellow-600 bg-yellow-50 dark:bg-yellow-950"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isConnected ? "Connected" : isPaused ? "Paused" : isInitializing ? "Connecting" : "Disconnected"}
                      </Badge>

                      {inst.phone && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {inst.phone}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      {isActive ? (
                        <>
                          <div className="flex items-center gap-2 px-1">
                            <Switch
                              checked={isConnected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleResume(inst.instance_id);
                                } else {
                                  handlePause(inst.instance_id);
                                }
                              }}
                              className={isPaused ? "opacity-60" : ""}
                            />
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {isConnected ? "On" : "Off"}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDisconnect(inst.instance_id)}
                            className="flex-1 h-7 text-xs rounded-lg gap-1 text-destructive hover:text-destructive"
                          >
                            <LogOut className="h-3 w-3" />
                            Putuskan
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(inst.instance_id)}
                          disabled={isInitializing || qrPolling}
                          className="flex-1 h-7 text-xs rounded-lg gap-1"
                        >
                          {isInitializing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Smartphone className="h-3 w-3" />
                          )}
                          {isInitializing ? "Menghubungkan..." : "Hubungkan"}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>
      </CardContent>

      {/* QR Dialog per instance */}
      <Dialog open={!!qrInstanceId} onOpenChange={(open) => { if (!open) { setQrInstanceId(null); stopQrPolling(); setQrTimeout(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-500" />
              Scan QR Code
            </DialogTitle>
            <DialogDescription>
              Buka WhatsApp di ponsel Anda, tap titik tiga atau Settings, lalu pilih Linked Devices. Scan QR code di bawah ini.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {qrPolling && !qrImageUrl && !qrTimeout && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Menunggu QR code...</p>
              </div>
            )}

            {qrImageUrl && (
              <div className="rounded-xl border-2 border-border p-3 bg-white">
                <img src={qrImageUrl} alt="WhatsApp QR Code" className="h-64 w-64" />
              </div>
            )}

            {qrImageUrl && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" />
                QR code diperbarui setiap 3 detik
              </div>
            )}

            {qrTimeout && !qrImageUrl && (
              <div className="flex flex-col items-center gap-3 py-4 px-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-destructive">Tidak ada QR code</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pastikan instance sudah di-restart dan tidak ada session lama.
                  </p>
                </div>
                <Button
                  onClick={() => qrInstanceId && handleConnect(qrInstanceId)}
                  className="mt-2 w-full gap-2"
                  variant="destructive"
                >
                  <RefreshCw className="h-4 w-4" />
                  Coba Lagi
                </Button>
              </div>
            )}

            {!qrTimeout && (
              <p className="text-xs text-center text-muted-foreground max-w-xs">
                QR code ini akan otomatis berubah jika sudah tidak berlaku. Jangan bagikan QR code ini kepada orang lain.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Instagram Connect Dialog */}
      <Dialog open={igDialog} onOpenChange={setIgDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-pink-500" />
              Konfigurasi Instagram
            </DialogTitle>
            <DialogDescription>
              Masukkan kredensial Instagram Business. Dapatkan dari{" "}
              <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="underline text-pink-600">Graph API Explorer</a>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <details className="rounded-lg border border-pink-200 bg-pink-50/50 dark:bg-pink-950/10 p-3 text-xs text-muted-foreground">
              <summary className="font-semibold text-pink-700 dark:text-pink-400 cursor-pointer">Cara mendapatkan kredensial</summary>
              <ol className="mt-2 space-y-1.5 list-decimal list-inside">
                <li>Buka <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="underline">Graph API Explorer</a></li>
                <li>Pilih App Anda &rarr; <strong>Get Token</strong> &rarr; <strong>Get Page Access Token</strong></li>
                <li>Pilih Page &rarr; <strong>Generate</strong> &rarr; salin <strong>Page ID</strong> dan <strong>Access Token</strong></li>
                <li>Cek IG Business: <code className="text-pink-600">GET /Page_ID?fields=instagram_business_account</code></li>
                <li>Dari response, salin <strong>instagram_business_account.id</strong></li>
                <li>Buat Verify Token bebas, misal <code className="text-pink-600">chatconnect_ig_2026</code></li>
              </ol>
              <p className="mt-2">Setelah simpan, atur webhook di <strong>Facebook Dev App &rarr; Instagram &rarr; Webhook</strong><br/>Callback URL: <code className="text-pink-600 break-all">{import.meta.env.VITE_BOT_API_URL || "https://chatconnectpro-production.up.railway.app"}/webhook/instagram</code><br/>Verify Token: (isi sesuai field di atas)</p>
            </details>

            <div>
              <Label className="text-xs">Page ID</Label>
              <Input value={igForm.page_id} onChange={e => setIgForm(f => ({ ...f, page_id: e.target.value }))} placeholder="123456789012345" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Access Token</Label>
              <Input value={igForm.access_token} onChange={e => setIgForm(f => ({ ...f, access_token: e.target.value }))} placeholder="EAAx..." className="h-9 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs">Instagram User ID</Label>
              <Input value={igForm.ig_user_id || ""} onChange={e => setIgForm(f => ({ ...f, ig_user_id: e.target.value }))} placeholder="178414..." className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Verify Token</Label>
              <Input value={igForm.verify_token} onChange={e => setIgForm(f => ({ ...f, verify_token: e.target.value }))} placeholder="chatconnect_ig_2026" className="h-9 text-sm font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIgDialog(false)} className="rounded-lg">Batal</Button>
            <Button onClick={handleIgConnect} className="rounded-lg bg-pink-600 hover:bg-pink-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Messenger Connect Dialog */}
      <Dialog open={msgrDialog} onOpenChange={setMsgrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              Konfigurasi Messenger
            </DialogTitle>
            <DialogDescription>
              Masukkan credentials dari Facebook Developer App &gt; Messenger &gt; Webhook.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Page ID</Label>
              <Input value={msgrForm.page_id} onChange={e => setMsgrForm(f => ({ ...f, page_id: e.target.value }))} placeholder="123456789012345" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Access Token</Label>
              <Input value={msgrForm.access_token} onChange={e => setMsgrForm(f => ({ ...f, access_token: e.target.value }))} placeholder="EAAx..." className="h-9 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs">Verify Token</Label>
              <Input value={msgrForm.verify_token} onChange={e => setMsgrForm(f => ({ ...f, verify_token: e.target.value }))} placeholder="chatconnect_msg_2026" className="h-9 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs">App Secret</Label>
              <Input value={msgrForm.app_secret || ""} onChange={e => setMsgrForm(f => ({ ...f, app_secret: e.target.value }))} placeholder="abcdef123456..." className="h-9 text-sm font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMsgrDialog(false)} className="rounded-lg">Batal</Button>
            <Button onClick={handleMsgrConnect} className="rounded-lg bg-blue-600 hover:bg-blue-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hapus instance?
            </AlertTitle>
            <AlertDesc>
              Instance ini akan dihapus permanen termasuk session WhatsApp-nya. Tindakan ini tidak bisa dibatalkan.
            </AlertDesc>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
}

function InstagramIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
}

function YoutubeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
}
