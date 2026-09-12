import { createFileRoute, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { motion } from "framer-motion";
import { checkAuth } from "@/lib/auth";

export const Route = createFileRoute("/analytics")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Analytics — ChatConnect Pro" },
      { name: "description", content: "Analytics dan statistik social media Anda." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
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
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Statistik dan performa social media Anda berdasarkan channel yang terhubung.
              </p>
            </motion.div>
            <AnalyticsDashboard />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
    </AuthGuard>
  );
}
