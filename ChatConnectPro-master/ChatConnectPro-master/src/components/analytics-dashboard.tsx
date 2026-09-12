import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Users,
  Radio,
  TrendingUp,
  TrendingDown,
  Loader2,
  Smartphone,
  BarChart3,
  Zap,
  MessageCircle,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api, type AnalyticsData } from "@/lib/api";

const dayNames: Record<string, string> = {
  Sun: "Min", Mon: "Sen", Tue: "Sel", Wed: "Rab", Thu: "Kam", Fri: "Jum", Sat: "Sab",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = dayNames[d.toDateString().slice(0, 3)] || d.toDateString().slice(0, 3);
  return `${day}, ${d.getDate()}/${d.getMonth() + 1}`;
}

const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";

const platformMeta: Record<string, { name: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  whatsapp: { name: "WhatsApp", icon: <MessageCircle className="h-5 w-5" />, color: "text-green-500", bgColor: "bg-green-100 dark:bg-green-900/30" },
  telegram: { name: "Telegram", icon: <Send className="h-5 w-5" />, color: "text-sky-500", bgColor: "bg-sky-100 dark:bg-sky-900/30" },
  messenger: { name: "Messenger", icon: <MessageSquare className="h-5 w-5" />, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  instagram: { name: "Instagram", icon: <MessageSquare className="h-5 w-5" />, color: "text-pink-600", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
};

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const d = await api.getAnalytics();
        setData(d);
      } catch (e) {
        console.error("Failed to fetch analytics:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <BarChart3 className="h-12 w-12 opacity-40" />
        <p>Gagal memuat data analytics</p>
      </div>
    );
  }

  const totalMsgs = data.messages.total;
  const incomingPct = totalMsgs > 0 ? Math.round((data.messages.incoming / totalMsgs) * 100) : 0;
  const outgoingPct = totalMsgs > 0 ? Math.round((data.messages.outgoing / totalMsgs) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Platform Overview */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-lg font-bold tracking-tight mb-3">Channel Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(platformMeta).map(([id, meta], i) => {
            const pb = data.platformBreakdown || {};
            const breakdown = pb[id];
            const hasActivity = !!breakdown && (breakdown.incoming > 0 || breakdown.outgoing > 0);
            const isActive = id === "whatsapp" || hasActivity;
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative rounded-xl border-2 bg-card p-4 transition-all hover:shadow-soft ${!isActive ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.bgColor} ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{meta.name}</p>
                    {isActive ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 mt-0.5 text-muted-foreground">
                        {breakdown ? `${breakdown.incoming + breakdown.outgoing} pesan` : "Aktif"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 mt-0.5 text-muted-foreground">
                        Soon
                      </Badge>
                    )}
                  </div>
                </div>
                {isActive && breakdown && (
                  <div className="mt-3 pt-3 border-t flex justify-between text-xs text-muted-foreground">
                    <span>{breakdown.incoming + breakdown.outgoing} pesan</span>
                    <span className="text-green-500">{breakdown.incoming} masuk</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.3 }}
        >
          <Card className="rounded-2xl border shadow-soft">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total Pesan</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquare className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight">{totalMsgs}</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">
                    <span className="text-green-500 font-medium">{data.messages.incoming}</span> masuk · <span className="text-blue-500 font-medium">{data.messages.outgoing}</span> keluar
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.3 }}
        >
          <Card className="rounded-2xl border shadow-soft">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted-foreground">Percakapan</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-chart-4/15 text-chart-4">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight">{data.conversations.active}</span>
                <p className="mt-1 text-xs text-muted-foreground">pelanggan unik</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <Card className="rounded-2xl border shadow-soft">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight">{data.responseRate}%</span>
                  {data.responseRate >= 80 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.messages.aiReplies} dari {data.messages.incoming} pesan masuk otomatis terjawab
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <Card className="rounded-2xl border shadow-soft">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted-foreground">Instance Aktif</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <Radio className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight">{data.instances.connected}</span>
                  <span className="text-sm text-muted-foreground">/ {data.instances.total}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.instances.disconnected > 0 ? `${data.instances.disconnected} instance terputus` : "Semua terhubung"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart + Top Senders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="rounded-2xl border shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-bold">Aktivitas Harian (30 hari)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {data.dailyActivity.length === 0 || data.dailyActivity.every(d => d.incoming === 0 && d.outgoing === 0) ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Belum ada data aktivitas
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dailyActivity} margin={{ left: -20, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      interval={3}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      labelFormatter={formatDate}
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="incoming" name="Masuk" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="outgoing" name="Keluar" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Senders */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          <Card className="rounded-2xl border shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-bold">Top Pengirim</CardTitle>
              <p className="text-xs text-muted-foreground">Pelanggan paling aktif (30 hari)</p>
            </CardHeader>
            <CardContent>
              {data.topSenders.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Users className="h-8 w-8 opacity-40" />
                  <p>Belum ada data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topSenders.slice(0, 5).map((s, i) => (
                    <div key={s.sender} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-muted-foreground text-center">
                        {i + 1}
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-brand text-white text-[10px] font-semibold">
                          {initials(s.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {s.sender.replace(/@.*/, "")}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs px-2">
                        {s.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Instance Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Card className="rounded-2xl border shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-bold">Status Instance WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            {data.instancePhones.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
                <Smartphone className="h-8 w-8 opacity-40" />
                <p>Belum ada instance WhatsApp</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Nomor</th>
                      <th className="px-4 py-3 font-medium">Instance ID</th>
                      <th className="px-4 py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.instancePhones.map((inst) => {
                      const connected = inst.status === "connected";
                      return (
                        <tr key={inst.instance_id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                              {inst.phone || "Belum terhubung"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                            {inst.instance_id.slice(0, 12)}...
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge
                              variant={connected ? "default" : "secondary"}
                              className={`text-[10px] px-2 py-0 h-5 gap-1 ${connected ? "bg-green-500/15 text-green-600 hover:bg-green-500/20" : ""}`}
                            >
                              {connected ? (
                                <><Wifi className="h-3 w-3" /> Connected</>
                              ) : (
                                <><WifiOff className="h-3 w-3" /> {inst.status === "initializing" ? "Connecting" : "Disconnected"}</>
                              )}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
