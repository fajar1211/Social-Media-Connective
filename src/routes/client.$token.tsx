import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Loader2, LayoutGrid, Sparkles, CalendarClock, Send, CheckCircle2, Trash2, Lightbulb, PlusCircle } from "lucide-react";
import { ContentDetailOverlay } from "@/components/content-detail-overlay";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlatformBadge, ContentTypeBadge, StatusBadge } from "@/components/badges";
import { counts, useStore, actions, formatDate, type ContentItem } from "@/lib/content-store";
import * as db from "@/lib/db";
import { useAuth } from "@/lib/auth";

type ClientInfo = {
  id: string;
  name: string;
  active: boolean;
};

type Tab = "content" | "ai-content";

const statusCards = [
  { key: "Suggested", label: "Suggested Posts", icon: Lightbulb },
  { key: "Additional", label: "Additional Posts", icon: PlusCircle },
  { key: "Submitted", label: "Submitted", icon: Send },
  { key: "Approved", label: "Approved", icon: CheckCircle2 },
  { key: "Deleted", label: "Deleted", icon: Trash2 },
] as const;

export const Route = createFileRoute("/client/$token")({
  head: () => ({
    meta: [
      { title: "Client Portal — Social Media Connective" },
      {
        name: "description",
        content: "View and manage your marketing content.",
      },
    ],
  }),
  component: ClientPortal,
});

function ClientPortal() {
  const { token } = Route.useParams();
  const { content, clients } = useStore();
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [tab, setTab] = useState<Tab>("content");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>("Suggested");
  const [monthFilter, setMonthFilter] = useState("all");

  useEffect(() => {
    async function validateToken() {
      const info = await db.getClientByMagicToken(token);
      if (info) {
        setClientInfo(info);
      } else {
        setError("Invalid or expired link. Please contact your administrator.");
      }
      setLoading(false);
    }
    validateToken();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !clientInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Link Unavailable</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const clientContent = content.filter((c) => c.clientId === clientInfo.id || c.client === clientInfo.name);
  const c = counts(clientContent);

  const months = Array.from(new Set(
    clientContent
      .map((c) => c.scheduledDate || c.date)
      .filter(Boolean)
      .map((d) => d.slice(0, 7))
  )).sort().reverse();

  const filteredByMonth = monthFilter === "all"
    ? clientContent
    : clientContent.filter((c) => (c.scheduledDate || c.date || "").startsWith(monthFilter));

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { Suggested: 0, Additional: 0, Submitted: 0, Approved: 0, Deleted: 0 };
    filteredByMonth.forEach((c) => {
      if (c.status in counts) counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [filteredByMonth]);

  const displayedContent = useMemo(() => {
    if (!selectedStatusFilter) return filteredByMonth;
    return filteredByMonth.filter((c) => c.status === selectedStatusFilter);
  }, [filteredByMonth, selectedStatusFilter]);

  const suggestedContent = clientContent.filter((c) => c.status === "Suggested");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">{clientInfo.name}</h1>
            <p className="text-sm text-muted-foreground">Content Dashboard</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex gap-1 rounded-lg border bg-muted p-1 w-fit">
          <button
            onClick={() => setTab("content")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "content"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="size-4" />
            Content
          </button>
          <button
            onClick={() => setTab("ai-content")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "ai-content"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="size-4" />
            AI Content
          </button>
        </div>

        {tab === "content" && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {statusCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() => setSelectedStatusFilter(selectedStatusFilter === card.key ? null : card.key)}
                  className={`rounded-xl border bg-card p-4 shadow-soft text-left transition-all ${
                    selectedStatusFilter === card.key ? "ring-2 ring-primary/50" : "hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl font-semibold tabular-nums">{statusCounts[card.key]}</span>
                    <card.icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{card.label}</p>
                  <div className="mt-3 h-1 rounded-full bg-muted">
                    <div
                      className="h-1 rounded-full bg-primary/70"
                      style={{
                        width: `${clientContent.length ? Math.max(6, ((statusCounts[card.key] || 0) / clientContent.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>

            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  {selectedStatusFilter ? `${selectedStatusFilter} Posts` : "All Content"}
                </h2>
                {selectedStatusFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStatusFilter(null)}>
                    Show All
                  </Button>
                )}
              </div>

              {months.length > 0 && (
                <div className="mb-4 flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Filter by month:</Label>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months ({clientContent.length})</SelectItem>
                      {months.map((m) => {
                        const label = new Date(m + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" });
                        const count = clientContent.filter((c) => (c.scheduledDate || c.date || "").startsWith(m)).length;
                        return (
                          <SelectItem key={m} value={m}>
                            {label} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {displayedContent.length > 0 ? (
                <div className="hidden overflow-hidden rounded-xl border bg-card shadow-soft md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Scheduled Post</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedContent.map((item) => {
                        const img = item.media?.[0] as string | undefined;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              {img ? (
                                <img src={img} alt="" className="h-10 w-10 rounded object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                                  {item.type === "Image" ? "IMG" : item.type === "Short Video" ? "VID" : item.type === "Carousel" ? "CAR" : "TXT"}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[280px] font-medium">{item.title}</TableCell>
                            <TableCell><PlatformBadge platform={item.platform} /></TableCell>
                            <TableCell><ContentTypeBadge type={item.type} /></TableCell>
                            <TableCell><StatusBadge status={item.status} /></TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {item.scheduledDate ? `${item.scheduledDate}${item.scheduledTime ? ` ${item.scheduledTime}` : ""}` : formatDate(item.date)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setSelected(item)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState message={`No content for ${clientInfo.name} yet.`} />
              )}
            </section>
          </>
        )}

        {tab === "ai-content" && (
          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <div>
              <h2 className="text-base font-semibold">AI Content Generator</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate marketing content using AI for {clientInfo.name}.
              </p>
            </div>
            {suggestedContent.length > 0 ? (
              <div className="mt-6 space-y-3">
                {suggestedContent.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4 transition-colors hover:bg-muted/30">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium leading-snug">{item.title}</h3>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.caption}
                        </p>
                        {item.hashtags?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.hashtags.slice(0, 6).map((tag, i) => (
                              <span key={i} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                #{tag}
                              </span>
                            ))}
                            {item.hashtags.length > 6 && (
                              <span className="text-[10px] text-muted-foreground">+{item.hashtags.length - 6}</span>
                            )}
                          </div>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <PlatformBadge platform={item.platform} />
                          <ContentTypeBadge type={item.type} />
                          {item.scheduledDate && (
                            <span className="flex items-center gap-1 text-[10px]">
                              <CalendarClock className="size-3" />
                              {item.scheduledDate} {item.scheduledTime || ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelected(item)}>
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                No AI-generated content yet.
              </div>
            )}
          </div>
        )}
      </main>

      {selected && <ContentDetailOverlay item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
