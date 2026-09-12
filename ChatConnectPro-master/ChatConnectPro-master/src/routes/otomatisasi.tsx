import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { motion } from "framer-motion";
import { checkAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  api,
  type AutoReplyRule,
  type Template,
  type ScheduledMessage,
  type BotInstance,
} from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Clock,
  Send,
  FileText,
  MessageSquare,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/otomatisasi")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Otomatisasi — ChatConnect Pro" },
      { name: "description", content: "Otomatisasi ChatConnect Pro." },
    ],
  }),
  component: PengaturanPage,
});

function PengaturanPage() {
  const [tab, setTab] = useState("templates");

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <AppHeader />
          <div className="flex-1 overflow-y-auto p-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-6"
            >
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="templates" className="gap-2">
                    <FileText className="h-4 w-4" /> Template
                  </TabsTrigger>
                  <TabsTrigger value="auto-reply" className="gap-2">
                    <Zap className="h-4 w-4" /> Auto-Reply
                  </TabsTrigger>
                  <TabsTrigger value="broadcast" className="gap-2">
                    <Send className="h-4 w-4" /> Broadcast
                  </TabsTrigger>
                  <TabsTrigger value="scheduled" className="gap-2">
                    <Clock className="h-4 w-4" /> Terjadwal
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="mt-6">
                  <TemplatesSection />
                </TabsContent>

                <TabsContent value="auto-reply" className="mt-6">
                  <AutoReplySection />
                </TabsContent>

                <TabsContent value="broadcast" className="mt-6">
                  <BroadcastSection />
                </TabsContent>

                <TabsContent value="scheduled" className="mt-6">
                  <ScheduledSection />
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

// ─── Templates Section ────────────────────────────────
function TemplatesSection() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    content: "",
    platform: "whatsapp",
    category: "Umum",
  });

  const load = async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch {
      toast.error("Gagal memuat template");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast.error("Nama dan konten wajib diisi");
      return;
    }
    try {
      if (editId) {
        await api.updateTemplate(editId, form);
        toast.success("Template diupdate");
      } else {
        await api.createTemplate(form);
        toast.success("Template dibuat");
      }
      setForm({ name: "", content: "", platform: "whatsapp", category: "Umum" });
      setEditId(null);
      load();
    } catch (e: any) {
      toast.error("Gagal simpan", { description: e.message });
    }
  };

  const remove = async (id: number) => {
    try {
      await api.deleteTemplate(id);
      toast.success("Template dihapus");
      load();
    } catch (e: any) {
      toast.error("Gagal hapus", { description: e.message });
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Template" : "Buat Template Baru"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Nama template"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Textarea
            placeholder="Konten pesan"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={3}
          />
          <div className="flex gap-3">
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="messenger">Messenger</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Kategori"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-40"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} size="sm">
              <Save className="h-4 w-4 mr-1" /> Simpan
            </Button>
            {editId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditId(null);
                  setForm({ name: "", content: "", platform: "whatsapp", category: "Umum" });
                }}
              >
                <X className="h-4 w-4 mr-1" /> Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Belum ada template</p>
        )}
        {templates.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{t.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {t.platform}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {t.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t.content}</p>
              </div>
              <div className="flex gap-1 shrink-0 ml-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditId(t.id);
                    setForm({
                      name: t.name,
                      content: t.content,
                      platform: t.platform,
                      category: t.category,
                    });
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => remove(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Auto-Reply Section ───────────────────────────────
function AutoReplySection() {
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    keyword: "",
    reply: "",
    match_type: "exact",
    platform: "whatsapp",
  });

  const load = async () => {
    try {
      const data = await api.getAutoReplyRules();
      setRules(data);
    } catch {
      toast.error("Gagal memuat aturan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.keyword.trim() || !form.reply.trim()) {
      toast.error("Keyword dan reply wajib diisi");
      return;
    }
    try {
      if (editId) {
        await api.updateAutoReplyRule(editId, form as any);
        toast.success("Aturan diupdate");
      } else {
        await api.createAutoReplyRule(form as any);
        toast.success("Aturan dibuat");
      }
      setForm({ keyword: "", reply: "", match_type: "exact", platform: "whatsapp" });
      setEditId(null);
      load();
    } catch (e: any) {
      toast.error("Gagal simpan", { description: e.message });
    }
  };

  const remove = async (id: number) => {
    try {
      await api.deleteAutoReplyRule(id);
      toast.success("Aturan dihapus");
      load();
    } catch (e: any) {
      toast.error("Gagal hapus", { description: e.message });
    }
  };

  const matchLabel = (m: string) => {
    const map: Record<string, string> = {
      exact: "Tepat",
      contains: "Mengandung",
      starts: "Awalan",
      regex: "Regex",
    };
    return map[m] || m;
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Aturan" : "Buat Aturan Baru"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Input
              placeholder="Kata kunci"
              value={form.keyword}
              onChange={(e) => setForm({ ...form, keyword: e.target.value })}
              className="flex-1"
            />
            <Select
              value={form.match_type}
              onValueChange={(v) => setForm({ ...form, match_type: v })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Tepat</SelectItem>
                <SelectItem value="contains">Mengandung</SelectItem>
                <SelectItem value="starts">Awalan</SelectItem>
                <SelectItem value="regex">Regex</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="messenger">Messenger</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Balasan otomatis"
            value={form.reply}
            onChange={(e) => setForm({ ...form, reply: e.target.value })}
            rows={2}
          />
          <div className="flex gap-2">
            <Button onClick={save} size="sm">
              <Save className="h-4 w-4 mr-1" /> Simpan
            </Button>
            {editId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditId(null);
                  setForm({ keyword: "", reply: "", match_type: "exact", platform: "whatsapp" });
                }}
              >
                <X className="h-4 w-4 mr-1" /> Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Belum ada aturan auto-reply
          </p>
        )}
        {rules.map((r) => (
          <Card key={r.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {matchLabel(r.match_type)}
                  </Badge>
                  <span className="font-mono text-sm font-bold">"{r.keyword}"</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {r.platform}
                  </Badge>
                  {!r.is_active && (
                    <Badge variant="destructive" className="text-[10px]">
                      Nonaktif
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">→ {r.reply}</p>
              </div>
              <div className="flex gap-1 shrink-0 ml-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditId(r.id);
                    setForm({
                      keyword: r.keyword,
                      reply: r.reply,
                      match_type: r.match_type,
                      platform: r.platform,
                    });
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Broadcast Section ────────────────────────────────
function BroadcastSection() {
  const [message, setMessage] = useState("");
  const [platform, setPlatform] = useState("whatsapp");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    total: number;
    errors: string[];
  } | null>(null);

  const send = async () => {
    if (!message.trim()) {
      toast.error("Pesan wajib diisi");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await api.sendBroadcast({ message: message.trim(), platform });
      setResult(res);
      if (res.sent > 0) toast.success(`Broadcast terkirim ke ${res.sent} kontak`);
      if (res.failed > 0) toast.error(`${res.failed} gagal dikirim`);
    } catch (e: any) {
      toast.error("Broadcast gagal", { description: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kirim Broadcast</CardTitle>
        <CardDescription>
          Pesan akan dikirim ke semua kontak yang pernah chat dengan bot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Tulis pesan broadcast..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <div className="flex items-center gap-3">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="messenger">Messenger</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={send} disabled={sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Kirim Broadcast
          </Button>
        </div>

        {result && (
          <div className="p-4 rounded-xl bg-muted/50 text-sm space-y-1">
            <p className="font-semibold">Hasil Broadcast</p>
            <p>
              ✅ Terkirim: <span className="font-bold text-green-600">{result.sent}</span>
            </p>
            <p>
              ❌ Gagal: <span className="font-bold text-destructive">{result.failed}</span>
            </p>
            <p>📊 Total kontak: {result.total}</p>
            {result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  Lihat error ({result.errors.length})
                </summary>
                <ul className="mt-1 space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-destructive">
                      • {e}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Scheduled Section ────────────────────────────────
function ScheduledSection() {
  const [items, setItems] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [instances, setInstances] = useState<BotInstance[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [form, setForm] = useState({
    recipient: "",
    message: "",
    scheduled_at: "",
    platform: "whatsapp",
    instance_id: "",
  });

  const load = async () => {
    try {
      const data = await api.getScheduledMessages();
      setItems(data);
    } catch {
      toast.error("Gagal memuat pesan terjadwal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api
      .getInstances()
      .then(setInstances)
      .catch(() => {});
  }, []);

  const filtered = items
    .filter((s) => !(s.status === "pending" && new Date(s.scheduled_at) <= new Date()))
    .filter(statusFilter === "all" ? () => true : (s) => s.status === statusFilter);

  const save = async () => {
    if (!form.recipient.trim() || !form.message.trim() || !form.scheduled_at) {
      toast.error("Semua field wajib diisi");
      return;
    }
    if (new Date(form.scheduled_at).getTime() < Date.now() + 60 * 60 * 1000) {
      toast.error("Jadwal minimal 1 jam dari sekarang");
      return;
    }
    if (!form.instance_id) {
      toast.error("Pilih nomor WhatsApp terlebih dahulu");
      return;
    }

    const waktuSama = items.find(
      (s) => s.status === "pending" && s.scheduled_at === new Date(form.scheduled_at).toISOString()
    );

    if (waktuSama) {
      const waktuList = items
        .filter((s) => s.status === "pending")
        .map((s) => new Date(s.scheduled_at).getTime())
        .sort((a, b) => b - a);

      const terakhir = new Date(waktuList[0]).toLocaleString("id-ID", {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
      });
      const saran = new Date(waktuList[0] + 2 * 60 * 1000).toLocaleString("id-ID", {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
      });

      toast.error("Waktu sudah ada yang pakai", {
        description: `Jadwal terakhir: ${terakhir}. Coba ${saran} atau pilih waktu lain.`,
      });
      return;
    }

    try {
      const scheduledAt = new Date(form.scheduled_at).toISOString();
      const jid = form.recipient.includes("@")
        ? form.recipient
        : `${form.recipient}@s.whatsapp.net`;
      await api.createScheduledMessage({
        recipient: jid,
        message: form.message.trim(),
        scheduled_at: scheduledAt,
        platform: form.platform,
        instance_id: form.instance_id,
      });
      toast.success("Pesan terjadwal dibuat");
      setForm({
        recipient: "",
        message: "",
        scheduled_at: "",
        platform: "whatsapp",
        instance_id: "",
      });
      load();
    } catch (e: any) {
      toast.error("Gagal", { description: e.message });
    }
  };

  const cancel = async (id: number) => {
    try {
      await api.cancelScheduledMessage(id);
      toast.success("Pesan dibatalkan");
      load();
    } catch (e: any) {
      toast.error("Gagal batalkan", { description: e.message });
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.deleteScheduledMessage(id);
      toast.success("Pesan terjadwal dihapus");
      load();
    } catch (e: any) {
      toast.error("Gagal hapus", { description: e.message });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      await api.bulkDeleteScheduledMessages(ids);
      toast.success(`${ids.length} pesan terjadwal dihapus`);
      setSelectedIds(new Set());
      load();
    } catch (e: any) {
      toast.error("Gagal hapus massal", { description: e.message });
    } finally {
      setBulkDeleting(false);
    }
  };

  const statusConfig = (s: string) => {
    const map: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
        icon: any;
        color: string;
      }
    > = {
      pending: { label: "Menunggu", variant: "outline", icon: Clock, color: "text-amber-500" },
      sent: { label: "Terkirim", variant: "default", icon: Send, color: "text-green-500" },
      cancelled: {
        label: "Dibatalkan",
        variant: "secondary",
        icon: X,
        color: "text-muted-foreground",
      },
      failed: { label: "Gagal", variant: "destructive", icon: X, color: "text-destructive" },
    };
    return (
      map[s] || {
        label: s,
        variant: "outline" as const,
        icon: Clock,
        color: "text-muted-foreground",
      }
    );
  };

  const formatPhone = (jid: string) => {
    const num = jid.replace(/@s\.whatsapp\.net$/, "").replace(/@.*$/, "");
    if (num.length >= 10) {
      return `+${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5, 8)} ${num.slice(8)}`;
    }
    return jid;
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buat Pesan Terjadwal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder="Nomor penerima (contoh: 628123456789)"
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
            />
            <Input
              type="datetime-local"
              value={form.scheduled_at}
              min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Isi pesan"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={2}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={form.instance_id}
              onValueChange={(v) => setForm({ ...form, instance_id: v })}
            >
              <SelectTrigger className="w-full sm:w-60">
                <SelectValue placeholder="Pilih nomor WhatsApp" />
              </SelectTrigger>
              <SelectContent>
                {instances.map((inst) => (
                  <SelectItem key={inst.instance_id} value={inst.instance_id}>
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${inst.status === "connected" ? "bg-green-500" : "bg-muted-foreground"}`}
                      />
                      {inst.phone || inst.instance_id.slice(0, 8) + "..."}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="messenger">Messenger</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={save} size="sm" className="w-full sm:w-auto">
              <Clock className="h-4 w-4 mr-1" /> Jadwalkan
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
          className="text-xs"
        >
          Semua
        </Button>
        {(["pending", "sent", "failed", "cancelled"] as const).map((f) => {
          const cfg = statusConfig(f);
          const Icon = cfg.icon;
          return (
            <Button
              key={f}
              variant={statusFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f)}
              className="text-xs"
            >
              {cfg.label} <Icon className="h-3 w-3 ml-1" />
            </Button>
          );
        })}

        <div className="ml-auto flex items-center gap-3">
          {filtered.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <Checkbox
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              Pilih Semua
            </label>
          )}
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="text-xs h-8"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1" />
              )}
              Hapus ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Belum ada pesan terjadwal</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {filtered.map((s) => {
          const cfg = statusConfig(s.status);
          const StatusIcon = cfg.icon;
          const isExpanded = expandedId === s.id;
          return (
            <Card key={s.id} className="hover:shadow-md transition-shadow group relative">
              <CardContent className="p-3">
                <div className="flex items-start gap-1.5">
                  <Checkbox
                    checked={selectedIds.has(s.id)}
                    onCheckedChange={() => toggleSelect(s.id)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] font-mono font-medium truncate">
                        {formatPhone(s.recipient)}
                      </p>
                      <Badge variant={cfg.variant} className="text-[9px] h-4 px-1 shrink-0">
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(s.scheduled_at).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-1.5">
                  <div className="relative">
                    <p
                      className={`text-[11px] text-muted-foreground whitespace-pre-wrap ${isExpanded ? "" : "line-clamp-2"}`}
                    >
                      {s.message}
                    </p>
                    {s.message.length > 100 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="text-[9px] text-primary hover:underline mt-0.5"
                      >
                        {isExpanded ? "Tutup" : "Selengkapnya"}
                      </button>
                    )}
                  </div>
                  {s.sent_at && (
                    <p className="text-[9px] text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <Send className="h-2.5 w-2.5" /> {new Date(s.sent_at).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>

                {s.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-destructive w-full mt-1.5 pt-1.5 border-t border-border/50 rounded-none"
                    onClick={() => cancel(s.id)}
                  >
                    <X className="h-3 w-3 mr-1" /> Batalkan
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
