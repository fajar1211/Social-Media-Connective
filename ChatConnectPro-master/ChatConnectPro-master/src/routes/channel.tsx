import { createFileRoute, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { motion } from "framer-motion";
import { checkAuth } from "@/lib/auth";

export const Route = createFileRoute("/channel")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Channel — ChatConnect Pro" },
      { name: "description", content: "Kelola koneksi social media Anda." },
    ],
  }),
  component: ChannelPage,
});

function ChannelPage() {
  return (
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
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Channel</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola koneksi WhatsApp, Instagram, Telegram, dan platform lainnya.
              </p>
            </motion.div>
            <IntegrationsPanel />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
