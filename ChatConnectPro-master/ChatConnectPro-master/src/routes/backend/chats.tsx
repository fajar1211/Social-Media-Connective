import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { checkAuth } from "@/lib/auth";
import { api, type ChatMessage, type AdminUser } from "@/lib/api";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, Search, RefreshCw } from "lucide-react";

const PAGE_SIZE = 50;

export const Route = createFileRoute("/backend/chats")({
  beforeLoad: async () => {
    const authed = await checkAuth();
    if (!authed) throw redirect({ to: "/backend/login" });
  },
  head: () => ({
    meta: [
      { title: "Chats — Admin ChatConnect Pro" },
    ],
  }),
  component: BackendChatsPage,
});

function BackendChatsPage() {
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    api.getAdminUsers().then(setUsers).catch(() => {});
  }, []);

  const load = useCallback(async (newOffset = 0, sender?: string, userId?: string) => {
    setLoading(true);
    try {
      const result = await api.getAdminChats(PAGE_SIZE, newOffset, sender || undefined, userId || undefined);
      setChats(result.data);
      setTotal(result.total);
      setOffset(newOffset);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(0, search, selectedUserId);
  }, [selectedUserId]);

  const doSearch = () => {
    setSearch(searchInput);
    load(0, searchInput, selectedUserId);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Semua percakapan dari seluruh instance</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari sender..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              className="pl-9 h-9 rounded-lg"
            />
          </div>

          <div className="w-64">
            <Select value={selectedUserId || "all"} onValueChange={(v) => { setSelectedUserId(v === "all" ? "" : v); setOffset(0); }}>
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

          <Button variant="outline" size="sm" onClick={doSearch} className="rounded-lg">Cari</Button>
          <Button variant="ghost" size="icon" onClick={() => { setSearch(""); setSearchInput(""); load(0, "", selectedUserId); }} className="rounded-lg">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">{total} pesan</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Percakapan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : chats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada chat</p>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {chats.map((chat) => (
                  <div key={chat.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${chat.direction === "incoming" ? "bg-blue-500" : "bg-green-500"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{chat.name || chat.sender.split("@")[0]}</span>
                        <Badge variant="outline" className="text-[10px]">{chat.direction}</Badge>
                        {chat.platform && <Badge variant="secondary" className="text-[10px]">{chat.platform}</Badge>}
                      </div>
                      <p className="text-sm mt-0.5 line-clamp-2">{chat.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(chat.created_at).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => load(offset - PAGE_SIZE, search, selectedUserId)} className="rounded-lg">
                  Sebelumnya
                </Button>
                <span className="text-xs text-muted-foreground">Halaman {currentPage} dari {totalPages}</span>
                <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => load(offset + PAGE_SIZE, search, selectedUserId)} className="rounded-lg">
                  Selanjutnya
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AdminLayout>
  );
}
