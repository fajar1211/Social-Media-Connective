import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { checkAuth, getAuthUser } from "@/lib/auth";
import { api, type AdminUser } from "@/lib/api";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Users, Trash2 } from "lucide-react";

export const Route = createFileRoute("/backend/users")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/backend/login" });
  },
  head: () => ({
    meta: [
      { title: "Users — Admin ChatConnect Pro" },
    ],
  }),
  component: BackendUsersPage,
});

function BackendUsersPage() {
  const currentUser = getAuthUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminUsers()
      .then(setUsers)
      .catch(() => toast.error("Gagal memuat data user"))
      .finally(() => setLoading(false));
  }, []);

  const removeUser = async (id: string) => {
    if (!confirm("Hapus admin user ini?")) return;
    try {
      await api.deleteAdminUser(id);
      toast.success("User dihapus");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      toast.error("Gagal hapus", { description: e.message });
    }
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen User</h1>
          <p className="text-sm text-muted-foreground mt-1">Daftar admin yang memiliki akses ke panel ini</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Admin Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada admin user</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{u.name || "Tanpa Nama"}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {u.id === currentUser?.id ? "Anda" : "Admin"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Login terakhir: {u.last_login ? new Date(u.last_login).toLocaleString("id-ID") : "-"}
                      </p>
                    </div>
                    {u.id !== currentUser?.id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0 ml-2" onClick={() => removeUser(u.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AdminLayout>
  );
}
