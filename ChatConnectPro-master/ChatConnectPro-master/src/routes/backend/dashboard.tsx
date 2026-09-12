import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { checkAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, Smartphone, MessageSquare, Wifi, Bot } from "lucide-react";

export const Route = createFileRoute("/backend/dashboard")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/backend/login" });
  },
  head: () => ({
    meta: [
      { title: "Dashboard Admin — ChatConnect Pro" },
      { name: "description", content: "Dashboard administrasi ChatConnect Pro." },
    ],
  }),
  component: BackendDashboardPage,
});

function BackendDashboardPage() {
  const [stats, setStats] = useState<{ totalUsers: number; totalInstances: number; connectedInstances: number; totalChats: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const cards = [
    { label: "Total User", value: stats?.totalUsers || 0, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Total Instance", value: stats?.totalInstances || 0, icon: Smartphone, color: "bg-blue-500/10 text-blue-500" },
    { label: "Connected", value: stats?.connectedInstances || 0, icon: Wifi, color: "bg-green-500/10 text-green-500" },
    { label: "Total Pesan", value: stats?.totalChats || 0, icon: MessageSquare, color: "bg-purple-500/10 text-purple-500" },
  ];

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview sistem ChatConnect Pro</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${c.color}`}><c.icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-2xl font-bold">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Informasi Sistem</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Backend Server</p>
                <p className="font-medium">{import.meta.env.VITE_BOT_API_URL || "localhost:3000"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Database</p>
                <p className="font-medium">Supabase</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Frontend</p>
                <p className="font-medium">Cloudflare Workers</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Auth</p>
                <p className="font-medium">Supabase Auth</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AdminLayout>
  );
}
