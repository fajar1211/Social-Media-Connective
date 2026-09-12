import { createFileRoute, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardStats } from "@/components/dashboard-stats";
import { KnowledgeManager } from "@/components/knowledge-manager";
import { ConversationsTable } from "@/components/conversations-table";
import { motion } from "framer-motion";
import { checkAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Dashboard — ChatConnect Pro" },
      { name: "description", content: "Panel admin ChatConnect Pro." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <AuthGuard loginPath="/login">
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <AppHeader />
          <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Selamat datang kembali 👋</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola integrasi, knowledge base, dan otomatisasi social media Anda.
              </p>
            </motion.div>

            <DashboardStats />
            <ConversationsTable />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
    </AuthGuard>
  );
}
