import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Filter, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type Conversation } from "@/lib/api";

const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j`;
  const days = Math.floor(hrs / 24);
  return `${days}h`;
}

export function ConversationsTable() {
  const navigate = useNavigate();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.getConversations();
        setConvs(data);
      } catch (e) {
        console.error("Failed to fetch conversations:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    const id = setInterval(fetch, 15000);
    return () => clearInterval(id);
  }, []);

  const filtered = convs.filter((r) => {
    const matchSearch = [r.name, r.sender, r.last_message].some((v) =>
      v?.toLowerCase().includes(q.toLowerCase())
    );
    const isNew = r.last_message && convs.filter((c) => c.sender === r.sender).length > 0;
    if (filter === "new") return matchSearch && isNew;
    return matchSearch;
  });

  return (
    <Card className="rounded-2xl border shadow-soft">
      <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Percakapan Terbaru</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "Memuat..." : `${convs.length} percakapan`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Cari..." className="h-9 pl-9 rounded-lg w-44"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-9 w-32 rounded-lg">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="new">Baru</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={() => navigate({ to: "/dashboard" })}>
            Lihat Semua
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Nama</th>
              <th className="px-5 py-3 font-medium">Nomor</th>
              <th className="px-5 py-3 font-medium">Pesan Terakhir</th>
              <th className="px-5 py-3 font-medium text-right">Waktu</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                  <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  Belum ada percakapan. Chat nomor bot untuk memulai.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                  Memuat data...
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.sender} className="border-b last:border-0 transition-colors hover:bg-muted/40 cursor-pointer">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-brand text-white text-xs font-semibold">
                        {initials(r.name || r.sender)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{r.name || "Tidak dikenal"}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground whitespace-nowrap font-mono text-xs">
                  {r.sender.replace(/@.*/, "")}
                </td>
                <td className="px-5 py-3 max-w-xs truncate text-muted-foreground">
                  {r.last_message || "—"}
                </td>
                <td className="px-5 py-3 text-right text-muted-foreground whitespace-nowrap text-xs">
                  {timeAgo(r.last_chat)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t p-4">
        <span className="text-xs text-muted-foreground">
          {filtered.length} percakapan
        </span>
      </div>
    </Card>
  );
}
