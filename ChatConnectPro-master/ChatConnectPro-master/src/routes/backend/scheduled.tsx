import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { checkAuth } from "@/lib/auth";
import { api, type ScheduledMessage } from "@/lib/api";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CalendarClock, CheckCircle2, XCircle, Clock, Ban } from "lucide-react";

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-amber-500/10 text-amber-600" },
  sent: { label: "Terkirim", icon: CheckCircle2, color: "bg-green-500/10 text-green-600" },
  failed: { label: "Gagal", icon: XCircle, color: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Dibatalkan", icon: Ban, color: "bg-muted/10 text-muted-foreground" },
};

const statusFilter = ["", "pending", "sent", "failed", "cancelled"];

export const Route = createFileRoute("/backend/scheduled")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/backend/login" });
  },
  head: () => ({
    meta: [
      { title: "Scheduled — Admin ChatConnect Pro" },
    ],
  }),
  component: BackendScheduledPage,
});

function BackendScheduledPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getAdminScheduled(filter || undefined);
      setMessages(data);
    } catch {
      toast.error("Gagal memuat pesan terjadwal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pesan Terjadwal</h1>
          <p className="text-sm text-muted-foreground mt-1">Semua pesan terjadwal di seluruh user</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {statusFilter.map((s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
              className="rounded-lg text-xs"
            >
              {s ? (statusConfig[s]?.label || s) : "Semua"}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Terjadwal ({messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada pesan terjadwal</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {messages.map((msg) => {
                  const cfg = statusConfig[msg.status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <div key={msg.id} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">{msg.recipient}</span>
                            <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                              <Icon className="h-3 w-3 mr-1 inline" />{cfg.label}
                            </Badge>
                            {msg.platform && <Badge variant="secondary" className="text-[10px]">{msg.platform}</Badge>}
                          </div>
                          <p className="text-sm mt-1 line-clamp-2">{msg.message}</p>
                          <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>User: {msg.user_id.slice(0, 8)}...</span>
                            <span>Jadwal: {new Date(msg.scheduled_at).toLocaleString("id-ID")}</span>
                            {msg.sent_at && <span>Terkirim: {new Date(msg.sent_at).toLocaleString("id-ID")}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AdminLayout>
  );
}
