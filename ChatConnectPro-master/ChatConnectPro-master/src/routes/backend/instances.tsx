import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { checkAuth } from "@/lib/auth";
import { api, type BotInstance, type AdminUser } from "@/lib/api";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Smartphone, Wifi, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/backend/instances")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/backend/login" });
  },
  head: () => ({
    meta: [
      { title: "Instances — Admin ChatConnect Pro" },
    ],
  }),
  component: BackendInstancesPage,
});

const statusIcon: Record<string, typeof Wifi> = {
  connected: Wifi,
  initializing: Clock,
  paused: Clock,
  stopped: XCircle,
};

const statusColor: Record<string, string> = {
  connected: "bg-green-500",
  initializing: "bg-amber-500",
  paused: "bg-blue-500",
  stopped: "bg-muted-foreground",
};

function BackendInstancesPage() {
  const [instances, setInstances] = useState<BotInstance[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    api.getAdminUsers().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [selectedUserId]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getAdminInstances(selectedUserId || undefined);
      setInstances(data);
    } catch {
      toast.error("Gagal memuat data instance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instance Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Instance bot per user</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-64">
            <Select value={selectedUserId || "all"} onValueChange={(v) => setSelectedUserId(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 rounded-lg">
                <SelectValue placeholder="Semua user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua user</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground">{instances.length} instance</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4" /> Instances
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : instances.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada instance</p>
            ) : (
              <div className="space-y-2">
                {instances.map((inst) => {
                  const Icon = statusIcon[inst.status] || XCircle;
                  return (
                    <div key={inst.instance_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${statusColor[inst.status] || "bg-muted-foreground"}`} />
                          <span className="text-sm font-medium">{inst.phone || inst.instance_id.slice(0, 12) + "..."}</span>
                          <Badge variant="outline" className="text-[10px]">{inst.status}</Badge>
                          {inst.platform && <Badge variant="secondary" className="text-[10px]">{inst.platform}</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          ID: {inst.instance_id} &middot; User: {inst.user_id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(inst.created_at).toLocaleDateString("id-ID")}
                        </p>
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
