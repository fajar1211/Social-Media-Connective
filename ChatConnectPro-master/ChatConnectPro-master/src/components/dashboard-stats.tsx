import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, MessageSquare, Loader2, TrendingUp, Wifi, WifiOff, Smartphone, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api, type BotInstance, type ChatMessage } from "@/lib/api";

interface PlatformStat {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  connected: boolean;
  phone?: string | null;
  todayMessages?: number;
  todayReplies?: number;
  totalConversations?: number;
  comingSoon?: boolean;
}

export function DashboardStats() {
  const [instances, setInstances] = useState<BotInstance[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingInstances, setTogglingInstances] = useState<Set<string>>(new Set());

  const fetch = async () => {
    try {
      const insts = await api.getInstances();
      setInstances(insts);
      const ids = insts.map((i) => i.instance_id);
      const c = ids.length > 0 ? await api.getChats(undefined, 5000, ids[0]) : [];
      setChats(c);
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (instanceId: string, currentStatus: string) => {
    if (togglingInstances.has(instanceId)) return;
    setTogglingInstances((prev) => new Set(prev).add(instanceId));
    try {
      if (currentStatus === "paused") {
        await api.resumeBot(instanceId);
        toast.success("Bot dilanjutkan");
      } else {
        await api.pauseBot(instanceId);
        toast.success("Bot dijeda");
      }
      fetch();
    } catch (e: any) {
      toast.error("Gagal", { description: e.message });
    } finally {
      setTogglingInstances((prev) => { const n = new Set(prev); n.delete(instanceId); return n; });
    }
  };

  useEffect(() => { fetch(); const id = setInterval(fetch, 10000); return () => clearInterval(id); }, []);

  const connectedInstance = instances.find((i) => i.status === "connected");
  const isConnected = !!connectedInstance;
  const phone = connectedInstance?.phone ? `+${connectedInstance.phone}` : null;

  const today = new Date().toDateString();
  const todayMsgs = chats.filter((c) => new Date(c.created_at).toDateString() === today && c.direction === "incoming");
  const todayReplies = chats.filter((c) => new Date(c.created_at).toDateString() === today && c.direction === "outgoing");
  const activeChats = new Set(chats.filter((c) => c.direction === "incoming").map((c) => c.sender)).size;
  const allReplies = chats.filter((c) => c.direction === "outgoing").length;

  const platforms: PlatformStat[] = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: <MessageCircle className="h-5 w-5" />,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      connected: isConnected,
      phone,
      todayMessages: todayMsgs.length,
      todayReplies: todayReplies.length,
      totalConversations: activeChats,
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: <Send className="h-5 w-5" />,
      color: "text-sky-500",
      bgColor: "bg-sky-100 dark:bg-sky-900/30",
      connected: false,
      comingSoon: true,
    },
    {
      id: "messenger",
      name: "Messenger",
      icon: <MessageSquare className="h-5 w-5" />,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      connected: false,
      comingSoon: true,
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: <MessageSquare className="h-5 w-5" />,
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      connected: false,
      comingSoon: true,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-2xl border shadow-soft">
            <CardContent className="p-5"><div className="h-20 animate-pulse rounded-lg bg-muted" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {platforms.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <Card className={`group relative overflow-hidden rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg ${p.comingSoon ? "opacity-70" : ""}`}>
            <CardContent className="p-5">
              {/* Header: icon + name + status */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${p.bgColor} ${p.color}`}>
                    {p.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{p.name}</h3>
                    {p.comingSoon ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 mt-0.5 text-muted-foreground">
                        Soon
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`relative flex h-2 w-2 ${p.connected ? "" : ""}`}>
                          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${p.connected ? "bg-success/70" : "bg-destructive/70"}`} />
                          <span className={`relative inline-flex h-2 w-2 rounded-full ${p.connected ? "bg-success" : "bg-destructive"}`} />
                        </span>
                        <span className="text-xs font-medium">{p.connected ? "Terkoneksi" : "Terputus"}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${p.bgColor} ${p.color}`}>
                  {p.connected ? <Wifi className="h-4 w-4" /> : p.comingSoon ? <Smartphone className="h-4 w-4 opacity-50" /> : <WifiOff className="h-4 w-4" />}
                </div>
              </div>

              {/* Body: stats or coming soon */}
              <div className="mt-4 space-y-2.5">
                {p.comingSoon ? (
                  <div className="py-2">
                    <p className="text-xs text-muted-foreground">Integrasi akan segera tersedia</p>
                  </div>
                ) : (
                  <>
                    {/* Phone number */}
                    {p.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Smartphone className="h-3 w-3" />
                        <span className="font-mono">{p.phone}</span>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pesan</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold">{p.todayMessages || 0}</span>
                          <span className="text-[10px] text-muted-foreground">hari ini</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balasan</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold">{p.todayReplies || 0}</span>
                          <span className="text-[10px] text-muted-foreground">hari ini</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Kontak</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold">{p.totalConversations || 0}</span>
                          <span className="text-[10px] text-muted-foreground">aktif</span>
                        </div>
                      </div>
                    </div>

                    {/* Response rate mini */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Response rate</span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Zap className="h-3 w-3 text-success" />
                        {p.todayMessages && p.todayMessages > 0
                          ? `${Math.round(((p.todayReplies || 0) / p.todayMessages) * 100)}%`
                          : "—"}
                      </span>
                    </div>

                    {/* Instance list with toggles */}
                    {p.id === "whatsapp" && instances.length > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                          Instance
                        </p>
                        <div className="space-y-1.5">
                          {instances.map((inst) => (
                            <div
                              key={inst.instance_id}
                              className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Smartphone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="text-xs font-mono truncate">
                                  {inst.phone ? `+${inst.phone}` : inst.instance_id.slice(0, 8) + '...'}
                                </span>
                                <span className="relative flex h-2 w-2 shrink-0">
                                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                                    inst.status === 'connected' ? 'bg-success/70' :
                                    inst.status === 'paused' ? 'bg-amber-500/70' : 'bg-destructive/70'
                                  }`} />
                                  <span className={`relative inline-flex h-2 w-2 rounded-full ${
                                    inst.status === 'connected' ? 'bg-success' :
                                    inst.status === 'paused' ? 'bg-amber-500' : 'bg-destructive'
                                  }`} />
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {inst.status === 'connected' ? 'Aktif' :
                                   inst.status === 'paused' ? 'Dijeda' :
                                   inst.status === 'initializing' ? 'Memuat...' : 'Putus'}
                                </span>
                              </div>
                              {inst.status === 'connected' || inst.status === 'paused' ? (
                                <Switch
                                  checked={inst.status === 'connected'}
                                  disabled={togglingInstances.has(inst.instance_id)}
                                  onCheckedChange={() => handleToggle(inst.instance_id, inst.status)}
                                  className="shrink-0"
                                />
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">—</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
