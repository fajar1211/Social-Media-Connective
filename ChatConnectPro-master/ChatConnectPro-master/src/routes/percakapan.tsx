import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { motion } from "framer-motion";
import { checkAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { api, getActiveInstance, setActiveInstance, type BotInstance, type ScheduledMessage } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Send, MessageCircle, RefreshCw, WifiOff, Trash2, AlertTriangle, Smartphone, Wifi, Bot, BotOff, MessageSquare, Download, PauseCircle, Clock, X, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/percakapan")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Percakapan — ChatConnect Pro" },
    ],
  }),
  component: PercakapanPage,
});

interface ChatRow {
  id: number;
  sender: string;
  name: string | null;
  message: string;
  direction: "incoming" | "outgoing";
  created_at: string;
}

const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "skrg";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j`;
  const days = Math.floor(hrs / 24);
  return `${days}h`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function PercakapanPage() {
  const [instances, setInstances] = useState<BotInstance[]>([]);
  const [activeInstance, setActiveInst] = useState<string | null>(null);
  const [convs, setConvs] = useState<{ sender: string; name: string; last_message: string; last_chat: string }[]>([]);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingConv, setDeletingConv] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);
  const [selectedSenders, setSelectedSenders] = useState<Set<string>>(new Set());
  const [bulkDeletingConvs, setBulkDeletingConvs] = useState(false);
  const [disabledSenders, setDisabledSenders] = useState<Set<string>>(new Set());
  const [togglingBot, setTogglingBot] = useState<string | null>(null);
  const [platFilter, setPlatFilter] = useState("all");
  const [botPaused, setBotPaused] = useState(false);
  const [togglingMaster, setTogglingMaster] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduledMsgs, setScheduledMsgs] = useState<ScheduledMessage[]>([]);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvNumber, setNewConvNumber] = useState("");
  const [newConvMessage, setNewConvMessage] = useState("");
  const [newConvDate, setNewConvDate] = useState("");
  const [newConvSending, setNewConvSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load instance list once on mount
  useEffect(() => {
    api.getInstances().then(setInstances).catch(() => {});
  }, []);

  // Load active instance dari localStorage (client-only, hindari hydration mismatch)
  useEffect(() => {
    const saved = getActiveInstance();
    if (saved) setActiveInst(saved);
  }, []);

  // Reset conversations when active instance changes
  useEffect(() => {
    if (!activeInstance) {
      setConvs([]);
      setMessages([]);
      setSelected(null);
      setLoading(false);
      return;
    }
    loadConvs();
    loadDisabled();
    loadBotStatus();
    const id = setInterval(() => {
      loadConvs();
      loadBotStatus();
      api.getInstances().then(setInstances).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [activeInstance]);

  async function loadDisabled() {
    if (!activeInstance) return;
    try {
      const res = await api.getDisabledSenders(activeInstance);
      setDisabledSenders(new Set(res.senders));
    } catch {}
  }

  // Reload messages when selected conversation changes
  useEffect(() => {
    if (!selected || !activeInstance) return;
    loadMsgs(selected);
    const id = setInterval(() => loadMsgs(selected), 10000);
    return () => clearInterval(id);
  }, [selected, activeInstance]);

  // Poll scheduled messages when a conversation is selected
  useEffect(() => {
    if (!selected || !activeInstance) return;
    loadScheduled();
    const id = setInterval(loadScheduled, 15000);
    return () => clearInterval(id);
  }, [selected, activeInstance]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function pickInstance(instanceId: string) {
    setActiveInst(instanceId);
    setActiveInstance(instanceId);
    setSelected(null);
    setLoading(true);
  }

  async function loadConvs() {
    if (!activeInstance) return;
    setError(null);
    try {
      const p = platFilter === "all" ? undefined : platFilter;
      const data = await api.getConversations(activeInstance, p);
      setConvs(data || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function loadMsgs(sender: string) {
    if (!activeInstance) return;
    setLoadingMsgs(true);
    try {
      const p = platFilter === "all" ? undefined : platFilter;
      const data = await api.getChats(sender, 500, activeInstance, p);
      setMessages(data as ChatRow[]);
    } catch (e) {
      console.error("Load messages error:", e);
    }
    setLoadingMsgs(false);
  }

  async function clearConversation(sender: string) {
    setDeletingConv(sender);
    try {
      const result = await api.deleteChat(sender);
      if (result.success) {
        setMessages((prev) => prev.filter((m) => m.sender !== sender));
        setConvs((prev) => prev.filter((c) => c.sender !== sender));
        if (selected === sender) setSelected(null);
      }
    } catch (e) {
      console.error("Delete error:", e);
    } finally {
      setDeletingConv(null);
      setConfirmClear(null);
    }
  }

  const toggleSelectSender = (sender: string) => {
    setSelectedSenders((prev) => {
      const next = new Set(prev);
      if (next.has(sender)) next.delete(sender);
      else next.add(sender);
      return next;
    });
  };

  const toggleSelectAllSenders = () => {
    if (selectedSenders.size === filtered.length) {
      setSelectedSenders(new Set());
    } else {
      setSelectedSenders(new Set(filtered.map((r) => r.sender)));
    }
  };

  const handleBulkDeleteConversations = async () => {
    const senders = Array.from(selectedSenders);
    if (senders.length === 0) return;
    setBulkDeletingConvs(true);
    try {
      await api.bulkDeleteConversations(senders);
      toast.success(`${senders.length} percakapan dihapus`);
      setSelectedSenders(new Set());
      if (selected && senders.includes(selected)) setSelected(null);
      loadConvs();
    } catch (e: any) {
      toast.error("Gagal hapus massal", { description: e.message });
    } finally {
      setBulkDeletingConvs(false);
    }
  };

  async function toggleBot(sender: string) {
    if (!activeInstance) return;
    const jid = sender.includes("@") ? sender : `${sender}@s.whatsapp.net`;
    const isDisabled = disabledSenders.has(jid);
    setTogglingBot(sender);
    try {
      if (isDisabled) {
        await api.enableBotForSender(activeInstance, jid);
        setDisabledSenders((prev) => { const n = new Set(prev); n.delete(jid); return n; });
        toast.success("Bot diaktifkan kembali");
      } else {
        await api.disableBotForSender(activeInstance, jid);
        setDisabledSenders((prev) => { const n = new Set(prev); n.add(jid); return n; });
        toast.success("Bot dinonaktifkan");
      }
    } catch (e: any) {
      toast.error("Gagal", { description: e.message });
    } finally {
      setTogglingBot(null);
    }
  }

  async function exportChats() {
    try {
      const p = platFilter === "all" ? undefined : platFilter;
      const data = await api.exportChats("csv", p);
      if (!data || data.length === 0) {
        toast.error("Tidak ada data untuk diexport");
        return;
      }
      const header = "id,sender,name,message,direction,platform,instance_id,recipient,is_read,created_at";
      const rows = data.map((r: any) =>
        [r.id, r.sender, `"${(r.name || "").replace(/"/g, '""')}"`, `"${r.message.replace(/"/g, '""')}"`, r.direction, r.platform, r.instance_id, r.recipient || "", r.is_read, r.created_at].join(",")
      );
      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chats-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Export ${data.length} chat berhasil`);
    } catch (e: any) {
      toast.error("Gagal export", { description: e.message });
    }
  }

  async function loadBotStatus() {
    if (!activeInstance) return;
    try {
      const status = await api.getBotStatus(activeInstance);
      setBotPaused(status.bot === "paused");
    } catch {}
  }

  async function handleMasterToggle() {
    if (!activeInstance || togglingMaster) return;
    setTogglingMaster(true);
    try {
      if (botPaused) {
        await api.resumeBot(activeInstance);
        setBotPaused(false);
        toast.success("Bot aktif untuk semua percakapan");
      } else {
        await api.pauseBot(activeInstance);
        setBotPaused(true);
        toast.success("Bot nonaktif untuk semua percakapan");
      }
    } catch (e: any) {
      toast.error("Gagal", { description: e.message });
    } finally {
      setTogglingMaster(false);
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !selected || !activeInstance || sending) return;
    const text = replyText.trim();
    const jid = selected.includes("@") ? selected : `${selected}@s.whatsapp.net`;
    setSending(true);
    try {
      const result = await api.sendMessage(activeInstance, jid, text);
      if (result.success) {
        setMessages((prev) => [...prev, {
          id: Date.now(),
          sender: selected,
          name: convs.find((c) => c.sender === selected)?.name || null,
          message: text,
          direction: "outgoing",
          created_at: new Date().toISOString(),
        }]);
        setReplyText("");
      }
    } catch (e: any) {
      console.error("Send error:", e);
      toast.error("Gagal mengirim", { description: e.message });
    } finally {
      setSending(false);
    }
  }

  const filtered = convs.filter((r) =>
    [r.name, r.sender, r.last_message].some((v) =>
      v?.toLowerCase().includes(q.toLowerCase())
    )
  );

  function openSchedule() {
    setScheduleMessage(replyText);
    const defaultDate = new Date(Date.now() + 3600000);
    setScheduleDate(defaultDate.toISOString().slice(0, 16));
    setScheduleOpen(true);
  }

  async function handleSchedule() {
    if (!scheduleMessage.trim() || !scheduleDate || !selected || !activeInstance || scheduling) return;
    setScheduling(true);
    try {
      const jid = selected.includes("@") ? selected : `${selected}@s.whatsapp.net`;
      await api.createScheduledMessage({
        recipient: jid,
        message: scheduleMessage.trim(),
        scheduled_at: new Date(scheduleDate).toISOString(),
        platform: platFilter === "all" ? "whatsapp" : platFilter,
        instance_id: activeInstance,
      });
      toast.success("Pesan terjadwal berhasil dibuat");
      setScheduleOpen(false);
      setScheduleMessage("");
      loadScheduled();
    } catch (e: any) {
      toast.error("Gagal menjadwalkan", { description: e.message });
    } finally {
      setScheduling(false);
    }
  }

  async function loadScheduled() {
    if (!selected || !activeInstance) return;
    try {
      const all = await api.getScheduledMessages(activeInstance);
      const jid = selected.includes("@") ? selected : `${selected}@s.whatsapp.net`;
      const filtered = all.filter((s) => s.recipient === jid && s.status === "pending");
      setScheduledMsgs(filtered);
    } catch {
      setScheduledMsgs([]);
    }
  }

  async function cancelScheduled(id: number) {
    setCancellingId(id);
    try {
      await api.cancelScheduledMessage(id);
      setScheduledMsgs((prev) => prev.filter((s) => s.id !== id));
      toast.success("Pesan terjadwal dibatalkan");
    } catch (e: any) {
      toast.error("Gagal membatalkan", { description: e.message });
    } finally {
      setCancellingId(null);
    }
  }

  async function handleNewConvSchedule() {
    if (!newConvNumber.trim() || !newConvMessage.trim() || !newConvDate || !activeInstance || newConvSending) return;
    setNewConvSending(true);
    try {
      const jid = newConvNumber.includes("@") ? newConvNumber : `${newConvNumber}@s.whatsapp.net`;
      await api.createScheduledMessage({
        recipient: jid,
        message: newConvMessage.trim(),
        scheduled_at: new Date(newConvDate).toISOString(),
        platform: "whatsapp",
        instance_id: activeInstance,
      });
      toast.success("Pesan terjadwal berhasil dibuat");
      setNewConvOpen(false);
      setNewConvNumber("");
      setNewConvMessage("");
      if (selected && selected.includes(newConvNumber.replace(/[^0-9]/g, ""))) {
        loadScheduled();
      }
    } catch (e: any) {
      toast.error("Gagal menjadwalkan", { description: e.message });
    } finally {
      setNewConvSending(false);
    }
  }

  const activeInstanceData = instances.find((i) => i.instance_id === activeInstance);

  if (!activeInstance) {
    return (
      <SidebarProvider>
      <div className="flex h-screen w-full bg-muted/30">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <AppHeader />
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Smartphone className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Belum pilih nomor WhatsApp</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Pilih nomor WhatsApp yang aktif untuk melihat percakapan. Buka halaman Integrasi untuk menghubungkan nomor baru.
                </p>
                <InstanceSelector
                  instances={instances}
                  activeInstance={activeInstance}
                  onSelect={pickInstance}
                  loading={loading}
                />
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-muted/30">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <AppHeader />
          <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto w-full flex-1 flex flex-col min-h-0"
            >
              {/* Instance selector */}
              <div className="mb-4 flex items-center gap-3 shrink-0">
                <InstanceSelector
                  instances={instances}
                  activeInstance={activeInstance}
                  onSelect={pickInstance}
                  loading={loading}
                />
                {activeInstanceData?.status === "connected" && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-950 px-2.5 py-1 rounded-full border border-green-500/20">
                    <Wifi className="h-3 w-3" />
                    {activeInstanceData.phone || "Terhubung"}
                  </span>
                )}
                {activeInstanceData?.status === "initializing" && (
                  <span className="flex items-center gap-1.5 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950 px-2.5 py-1 rounded-full border border-yellow-500/20">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Menghubungkan...
                  </span>
                )}
                {activeInstanceData?.status === "stopped" && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border">
                    <WifiOff className="h-3 w-3" />
                    Tidak terhubung
                  </span>
                )}
              </div>

              {/* Platform filter tabs */}
              <div className="flex items-center gap-1 mb-4 shrink-0">
                {[
                  { id: "all", label: "Semua", icon: null },
                  { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-3.5 w-3.5" />, color: "text-green-600" },
                  { id: "instagram", label: "Instagram", icon: <MessageSquare className="h-3.5 w-3.5" />, color: "text-pink-600" },
                  { id: "messenger", label: "Messenger", icon: <MessageCircle className="h-3.5 w-3.5" />, color: "text-blue-600" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setPlatFilter(tab.id); setLoading(true); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      platFilter === tab.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.icon && <span className={tab.color}>{tab.icon}</span>}
                    {tab.label}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                  <WifiOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Gagal memuat data</p>
                    <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
                    <button onClick={() => { setLoading(true); loadConvs(); }} className="text-xs text-destructive underline mt-1">
                      Coba lagi
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
                <div className={`w-full lg:w-96 shrink-0 flex flex-col min-h-0 ${selected ? "hidden lg:flex" : ""}`}>
                  <div className="rounded-2xl border bg-card shadow-soft flex flex-col min-h-0 overflow-hidden">
                    <div className="border-b p-4 shrink-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold">Percakapan</h2>
                          <button
                            onClick={() => { setNewConvNumber(""); setNewConvMessage(""); setNewConvOpen(true); const d = new Date(Date.now() + 3600000); setNewConvDate(d.toISOString().slice(0, 16)); }}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            title="Percakapan Baru"
                          >
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {selectedSenders.size > 0 ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-xs h-7"
                              onClick={handleBulkDeleteConversations}
                              disabled={bulkDeletingConvs}
                            >
                              {bulkDeletingConvs ? (
                                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Hapus ({selectedSenders.size})
                            </Button>
                          ) : (
                            <>
                              {filtered.length > 0 && (
                                <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted">
                                  <Checkbox
                                    checked={selectedSenders.size === filtered.length && filtered.length > 0}
                                    onCheckedChange={toggleSelectAllSenders}
                                    className="h-3.5 w-3.5"
                                  />
                                  Pilih
                                </label>
                              )}
                              {activeInstance && (activeInstanceData?.status === "connected" || activeInstanceData?.status === "paused") && (
                                <>
                                  <Switch
                                    checked={!botPaused}
                                    disabled={togglingMaster}
                                    onCheckedChange={handleMasterToggle}
                                    className="shrink-0 scale-75"
                                  />
                                  <span className="text-[10px] font-medium text-muted-foreground">
                                    {togglingMaster ? (
                                      <div className="animate-spin h-3 w-3 border-2 border-muted-foreground border-t-transparent rounded-full" />
                                    ) : botPaused ? (
                                      "Off"
                                    ) : (
                                      "On"
                                    )}
                                  </span>
                                </>
                              )}
                              <button
                                onClick={() => exportChats()}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                title="Export chats"
                              >
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button onClick={() => { setLoading(true); loadConvs(); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Refresh">
                                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {loading ? "Memuat..." : `${convs.length} percakapan`}
                        {platFilter !== "all" && ` • ${platFilter.charAt(0).toUpperCase() + platFilter.slice(1)}`}
                      </p>
                      <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={q} onChange={(e) => setQ(e.target.value)}
                          placeholder="Cari..."
                          className="h-9 pl-9 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-border/40 flex-1 overflow-y-auto">
                      {loading && (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          <div className="animate-spin h-6 w-6 border-2 border-muted-foreground border-t-transparent rounded-full mx-auto mb-2" />
                          Memuat...
                        </div>
                      )}

                      {!loading && filtered.length === 0 && (
                        <div className="p-8 text-center">
                          <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-40 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {q ? "Tidak ada hasil" : "Belum ada percakapan"}
                          </p>
                          {!q && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {platFilter === "whatsapp" ? "Chat nomor WhatsApp bot untuk memulai" :
                               platFilter === "instagram" ? "Chat akun Instagram untuk memulai" :
                               platFilter === "messenger" ? "Chat Facebook Page untuk memulai" :
                               "Hubungkan platform untuk memulai percakapan"}
                            </p>
                          )}
                        </div>
                      )}

                      {!loading && filtered.map((r) => {
                        const jid = r.sender.includes("@") ? r.sender : `${r.sender}@s.whatsapp.net`;
                        const botDisabled = disabledSenders.has(jid);
                        return (
                        <div key={r.sender} className={`group flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-muted/50 ${selected === r.sender ? "bg-muted/60" : ""}`} onClick={() => setSelected(r.sender)}>
                          <Checkbox
                            checked={selectedSenders.has(r.sender)}
                            onCheckedChange={() => toggleSelectSender(r.sender)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          />
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className={`text-white text-xs font-semibold ${botDisabled ? "bg-orange-500" : "bg-gradient-brand"}`}>
                              {initials(r.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold truncate">{r.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(r.last_chat)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{r.last_message || "—"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-muted-foreground/60 truncate">{r.sender.replace(/@.*/, "")}</p>
                              {botDisabled && (
                                <span className="text-[10px] text-orange-600 bg-orange-50 dark:bg-orange-950 px-1.5 py-0.5 rounded font-medium">
                                  Bot Nonaktif
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleBot(r.sender); }}
                              disabled={togglingBot === r.sender}
                              className={`p-2 rounded-lg hover:bg-muted transition-colors ${
                                botDisabled ? "text-green-600 hover:text-green-700" : "text-muted-foreground hover:text-orange-600"
                              }`}
                              title={botDisabled ? "Aktifkan bot" : "Nonaktifkan bot"}
                            >
                              {togglingBot === r.sender ? (
                                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                              ) : botDisabled ? (
                                <Bot className="h-4 w-4" />
                              ) : (
                                <BotOff className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmClear(r.sender); }}
                              disabled={deletingConv === r.sender}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                              title="Hapus percakapan"
                            >
                              {deletingConv === r.sender ? (
                                <div className="animate-spin h-4 w-4 border-2 border-destructive border-t-transparent rounded-full" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      );})}
                    </div>
                  </div>
                </div>

                {selected && (
                  <div className="flex-1 flex flex-col min-h-0 rounded-2xl border bg-card shadow-soft overflow-hidden">
                    <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0 bg-muted/20">
                      <button onClick={() => setSelected(null)} className="p-1 -ml-1 rounded-lg hover:bg-muted transition-colors lg:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                      </button>
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-gradient-brand text-white text-xs font-semibold">
                          {initials(convs.find((c) => c.sender === selected)?.name || selected)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{convs.find((c) => c.sender === selected)?.name || "Tidak dikenal"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{selected.replace(/@.*/, "")}</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {loadingMsgs && messages.length === 0 && (
                        <div className="h-full flex items-center justify-center">
                          <div className="animate-spin h-6 w-6 border-2 border-muted-foreground border-t-transparent rounded-full" />
                        </div>
                      )}

                      {!loadingMsgs && messages.length === 0 && (
                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                          Belum ada pesan
                        </div>
                      )}

                      {messages.map((msg) => {
                        const isOut = msg.direction === "outgoing";
                        return (
                          <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              isOut
                                ? "bg-gradient-brand text-white rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            }`}>
                              <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                              <p className={`text-[10px] mt-1 ${isOut ? "text-white/70" : "text-muted-foreground"} text-right`}>
                                {formatTime(msg.created_at)}
                                {isOut && " ✓"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </div>

                    {scheduledMsgs.length > 0 && (
                      <div className="border-t px-4 py-3 space-y-2 shrink-0 bg-muted/10">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pesan Terjadwal
                        </p>
                        {scheduledMsgs.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-xl border bg-card">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground truncate">{s.message}</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                {new Date(s.scheduled_at).toLocaleString("id-ID", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {s.status === "pending" ? "Menunggu" :
                               s.status === "sent" ? "Terkirim" :
                               s.status === "failed" ? "Gagal" : "Dibatalkan"}
                            </Badge>
                            {s.status === "pending" && (
                              <button
                                onClick={() => cancelScheduled(s.id)}
                                disabled={cancellingId === s.id}
                                className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                title="Batalkan"
                              >
                                {cancellingId === s.id ? (
                                  <div className="animate-spin h-3.5 w-3.5 border-2 border-destructive border-t-transparent rounded-full" />
                                ) : (
                                  <X className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t p-3 shrink-0">
                      {(() => {
                        const jid = selected.includes("@") ? selected : `${selected}@s.whatsapp.net`;
                        if (disabledSenders.has(jid)) {
                          return (
                            <div className="mb-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                              <p className="text-xs text-orange-700 dark:text-orange-300">
                                Bot nonaktif untuk pengguna ini. Admin cukup chat "Terima kasih atas waktu luang anda, kami harap dapat bekerja sama dengan anda" untuk mengaktifkan bot kembali secara otomatis.
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="flex items-center gap-2">
                        <Input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Ketik pesan..."
                          className="flex-1 h-10 rounded-xl text-sm"
                          disabled={sending}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={openSchedule}
                          disabled={!replyText.trim() || sending}
                          className="h-10 w-10 rounded-xl shrink-0"
                          title="Jadwalkan pesan"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button
                          type="submit"
                          size="icon"
                          disabled={!replyText.trim() || sending}
                          className="h-10 w-10 rounded-xl shrink-0 bg-gradient-brand hover:opacity-90 disabled:opacity-50"
                        >
                          {sending ? (
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </form>
                    </div>
                  </div>
                )}

                {!selected && (
                  <div className="flex-1 hidden lg:flex items-center justify-center rounded-2xl border bg-card shadow-soft">
                    <div className="text-center max-w-xs p-8">
                      <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <MessageCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-muted-foreground">Pilih percakapan</h3>
                      <p className="text-sm text-muted-foreground mt-1">Pilih percakapan dari daftar untuk melihat pesan dan membalas</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </SidebarInset>
      </div>
      <AlertDialog open={!!confirmClear} onOpenChange={() => setConfirmClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hapus percakapan?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Semua pesan dari percakapan ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmClear && clearConversation(confirmClear)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingConv ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Percakapan Baru
            </DialogTitle>
            <DialogDescription>
              Jadwalkan pesan ke nomor WhatsApp baru
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nomor Penerima</label>
              <Input
                value={newConvNumber}
                onChange={(e) => setNewConvNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="628123456789"
                className="w-full"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Format internasional, tanpa + atau spasi</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Pesan</label>
              <Textarea
                value={newConvMessage}
                onChange={(e) => setNewConvMessage(e.target.value)}
                placeholder="Tulis pesan..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Jadwal Kirim</label>
              <Input
                type="datetime-local"
                value={newConvDate}
                onChange={(e) => setNewConvDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewConvOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleNewConvSchedule}
              disabled={!newConvNumber.trim() || !newConvMessage.trim() || !newConvDate || newConvSending}
              className="bg-gradient-brand hover:opacity-90"
            >
              {newConvSending ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1" />
              ) : (
                <Clock className="h-4 w-4 mr-1" />
              )}
              Jadwalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Jadwalkan Pesan
            </DialogTitle>
            <DialogDescription>
              Pesan akan dikirim otomatis sesuai jadwal ke nomor ini:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 border text-sm font-mono text-muted-foreground truncate">
              {selected?.replace(/@.*/, "") || "—"}
            </div>
            <Textarea
              value={scheduleMessage}
              onChange={(e) => setScheduleMessage(e.target.value)}
              placeholder="Tulis pesan..."
              rows={3}
            />
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!scheduleMessage.trim() || !scheduleDate || scheduling}
              className="bg-gradient-brand hover:opacity-90"
            >
              {scheduling ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1" />
              ) : (
                <Clock className="h-4 w-4 mr-1" />
              )}
              Jadwalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function InstanceSelector({ instances, activeInstance, onSelect, loading }: {
  instances: BotInstance[];
  activeInstance: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  return (
    <Select value={activeInstance || ""} onValueChange={onSelect}>
      <SelectTrigger className="w-[260px] h-9 rounded-lg text-sm">
        <SelectValue placeholder={loading ? "Memuat..." : "Pilih nomor WhatsApp"} />
      </SelectTrigger>
      <SelectContent>
        {instances.map((inst) => (
          <SelectItem key={inst.instance_id} value={inst.instance_id}>
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${
                inst.status === "connected" ? "bg-green-500" :
                inst.status === "initializing" ? "bg-yellow-500" :
                "bg-muted-foreground"
              }`} />
              {inst.phone || inst.instance_id.slice(0, 8) + "..."}
            </span>
          </SelectItem>
        ))}
        {instances.length === 0 && !loading && (
          <div className="px-2 py-4 text-xs text-center text-muted-foreground">
            Belum ada instance
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
