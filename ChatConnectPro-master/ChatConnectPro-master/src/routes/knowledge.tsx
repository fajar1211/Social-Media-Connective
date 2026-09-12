import { createFileRoute, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { KnowledgeManager } from "@/components/knowledge-manager";
import { motion } from "framer-motion";
import { checkAuth } from "@/lib/auth";

export const Route = createFileRoute("/knowledge")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Knowledge Base — ChatConnect Pro" },
      { name: "description", content: "Kelola pengetahuan AI untuk jawaban otomatis." },
    ],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
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
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Knowledge Base</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Tambah & kelola data pengetahuan untuk jawaban otomatis AI di semua platform.
              </p>
            </motion.div>

            <KnowledgeManager />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
