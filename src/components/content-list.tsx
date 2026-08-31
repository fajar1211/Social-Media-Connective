import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Send, CalendarClock, ExternalLink, Trash2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContentTypeBadge, PlatformBadge, StatusBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { ContentDetailOverlay } from "@/components/content-detail-overlay";
import {
  actions,
  CONTENT_TYPES,
  PLATFORMS,
  STATUSES,
  formatDate,
  useStore,
  type ContentItem,
  type FacebookPage,
} from "@/lib/content-store";

const ALL = "all";

function ContentActions({ item }: { item: ContentItem }) {
  const { clients } = useStore();
  const [publishing, setPublishing] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [showPageSelect, setShowPageSelect] = useState(false);

  const client = clients.find((c) => c.name === item.client);
  const fbConnection = client?.socialIntegrations?.Facebook;
  const pages: FacebookPage[] = fbConnection?.pages || [];
  const canPublish = item.platform === "Facebook" && fbConnection?.connected && fbConnection?.accessToken && pages.length > 0;

  if (!canPublish || item.status === "Deleted" || item.status === "Approved") {
    return null;
  }

  const handlePublish = async (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    setPublishing(true);
    try {
      const message = `${item.caption}\n\n${item.body || ""}\n\n${item.hashtags.join(" ")}`;

      const response = await fetch("/api/facebook/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          pageAccessToken: page.access_token,
          message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        actions.update(item.id, {
          status: "Approved",
          notes: `Published to ${page.name} (Post ID: ${data.postId})`,
        });
        toast.success(`Published to ${page.name}!`);
        setShowPageSelect(false);
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch {
      toast.error("Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page || !scheduleTime) return;

    const scheduledDate = new Date(scheduleTime);
    if (scheduledDate <= new Date()) {
      toast.error("Schedule time must be in the future");
      return;
    }

    setPublishing(true);
    try {
      const message = `${item.caption}\n\n${item.body || ""}\n\n${item.hashtags.join(" ")}`;

      const response = await fetch("/api/facebook/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          pageAccessToken: page.access_token,
          message,
          scheduledPublishTime: scheduledDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        actions.update(item.id, {
          status: "Submitted",
          notes: `Scheduled for ${scheduledDate.toLocaleString()} on ${page.name}`,
        });
        toast.success(`Scheduled for ${scheduledDate.toLocaleString()}!`);
        setShowSchedule(false);
        setShowPageSelect(false);
        setScheduleTime("");
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch {
      toast.error("Failed to schedule");
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteFromFacebook = async () => {
    if (!fbConnection?.accessToken) return;

    const postMatch = item.notes?.match(/Post ID: (\d+_\d+)/);
    if (!postMatch) {
      toast.error("No Facebook Post ID found");
      return;
    }

    const postId = postMatch[1];
    setPublishing(true);
    try {
      const response = await fetch("/api/facebook/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          pageAccessToken: fbConnection.accessToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newNotes = item.notes?.replace(/\(Post ID:.*?\)/, "(Deleted from Facebook)");
        actions.update(item.id, {
          status: "Deleted",
          ...(newNotes !== undefined ? { notes: newNotes } : {}),
        });
        toast.success("Deleted from Facebook");
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {!showPageSelect && !showSchedule && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Publish to Facebook"
            onClick={() => setShowPageSelect(true)}
            disabled={publishing}
          >
            <Send className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Schedule on Facebook"
            onClick={() => {
              setShowPageSelect(true);
              setShowSchedule(true);
            }}
            disabled={publishing}
          >
            <CalendarClock className="size-3.5" />
          </Button>
        </>
      )}

      {showPageSelect && (
        <div className="flex items-center gap-1">
          <Select
            onValueChange={(pageId) => {
              if (showSchedule) {
                handleSchedule(pageId);
              } else {
                handlePublish(pageId);
              }
            }}
          >
            <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs" onClick={(e) => e.stopPropagation()}>
              <SelectValue placeholder="Select page" />
            </SelectTrigger>
            <SelectContent>
              {pages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showSchedule && (
            <Input
              type="datetime-local"
              className="h-7 w-[160px] text-xs"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(e) => {
              e.stopPropagation();
              setShowPageSelect(false);
              setShowSchedule(false);
              setScheduleTime("");
            }}
          >
            ✕
          </Button>
        </div>
      )}

      {item.notes?.includes("Post ID:") && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title="Delete from Facebook"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteFromFacebook();
          }}
          disabled={publishing}
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

export function ContentCard({ item, onClick }: { item: ContentItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border bg-card p-4 text-left shadow-soft transition-colors hover:bg-accent/40"
    >
      <p className="text-sm font-medium leading-snug">{item.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {item.client} · {formatDate(item.date)}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <PlatformBadge platform={item.platform} />
        <ContentTypeBadge type={item.type} />
        <StatusBadge status={item.status} />
      </div>
    </button>
  );
}

export function ContentTable({
  items,
  onSelect,
  showStatus = true,
  dateLabel = "Date",
}: {
  items: ContentItem[];
  onSelect: (item: ContentItem) => void;
  showStatus?: boolean;
  dateLabel?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const approveSelected = () => {
    let count = 0;
    selectedIds.forEach((id) => {
      const item = items.find((i) => i.id === id);
      if (item && item.status !== "Approved" && item.status !== "Deleted") {
        actions.update(id, { status: "Approved" });
        count++;
      }
    });
    setSelectedIds(new Set());
    if (count > 0) toast.success(`${count} posts approved`);
  };

  const deleteSelected = () => {
    let count = 0;
    selectedIds.forEach((id) => {
      const item = items.find((i) => i.id === id);
      if (item && item.status !== "Deleted") {
        actions.update(id, { status: "Deleted" });
        count++;
      }
    });
    setSelectedIds(new Set());
    if (count > 0) toast.success(`${count} posts deleted`);
  };

  const firstImage = (item: ContentItem): string | null => {
    if (item.media && item.media.length > 0) return item.media[0] as string;
    return null;
  };

  return (
    <>
      {someSelected && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border bg-accent/50 px-4 py-2">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={approveSelected}>
              <CheckCircle2 className="mr-1 size-3.5" />
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={deleteSelected}>
              <Trash2 className="mr-1 size-3.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-soft md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="size-4 rounded border-muted-foreground/25"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Type</TableHead>
              {showStatus && <TableHead>Status</TableHead>}
              <TableHead>{dateLabel}</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const img = firstImage(item);
              return (
                <TableRow
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="size-4 rounded border-muted-foreground/25"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
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
                  <TableCell>
                    <PlatformBadge platform={item.platform} />
                  </TableCell>
                  <TableCell>
                    <ContentTypeBadge type={item.type} />
                  </TableCell>
                  {showStatus && (
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(item.date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ContentActions item={item} />
                      <Button variant="ghost" size="sm" className="text-xs">
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} onClick={() => onSelect(item)} />
        ))}
      </div>
    </>
  );
}

export function ContentList({
  status,
  clientFilter,
  emptyMessage,
  showStatusFilter = true,
  showClientFilter = true,
  dateLabel,
}: {
  status?: ContentItem["status"];
  clientFilter?: string;
  emptyMessage?: string;
  showStatusFilter?: boolean;
  showClientFilter?: boolean;
  dateLabel?: string;
}) {
  const { content, clients } = useStore();
  const [query, setQuery] = useState("");
  const [client, setClient] = useState(clientFilter ?? ALL);
  const [platform, setPlatform] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<ContentItem | null>(null);

  const effectiveClient = clientFilter ?? client;

  const items = useMemo(() => {
    let list = content.filter((c) => (status ? c.status === status : c.status !== "Deleted"));
    if (query.trim())
      list = list.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()));
    if (effectiveClient !== ALL) list = list.filter((c) => c.client === effectiveClient);
    if (platform !== ALL) list = list.filter((c) => c.platform === platform);
    if (type !== ALL) list = list.filter((c) => c.type === type);
    if (!status && statusFilter !== ALL) list = list.filter((c) => c.status === statusFilter);
    return [...list].sort((a, b) =>
      sort === "newest"
        ? b.date.localeCompare(a.date)
        : sort === "oldest"
          ? a.date.localeCompare(b.date)
          : a.title.localeCompare(b.title),
    );
  }, [content, status, query, effectiveClient, platform, type, statusFilter, sort]);

  const current = selected ? (content.find((c) => c.id === selected.id) ?? null) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search content"
            className="pl-9"
          />
        </div>
        {showClientFilter && !clientFilter && (
          <Select value={client} onValueChange={setClient}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {CONTENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!status && showStatusFilter && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length ? (
        <ContentTable
          items={items}
          onSelect={setSelected}
          showStatus={!status}
          dateLabel={dateLabel ?? "Date"}
        />
      ) : (
        <EmptyState message={emptyMessage ?? "No content yet"} />
      )}

      <ContentDetailOverlay item={current} onClose={() => setSelected(null)} />
    </div>
  );
}
