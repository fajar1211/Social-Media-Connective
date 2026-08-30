import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Lightbulb,
  PlusCircle,
  Send,
  CheckCircle2,
  Trash2,
  UploadCloud,
  FileSpreadsheet,
  Link2,
  Settings,
  LayoutGrid,
  Check,
  ExternalLink,
  Globe,
  Clock,
  CalendarClock,
  Sparkles,
  Image,
  Film,
  SquareCheck,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientStatusBadge, PlatformBadge, ContentTypeBadge, StatusBadge } from "@/components/badges";
import { ContentList } from "@/components/content-list";
import { counts, useStore, actions, SOCIAL_PLATFORMS, formatDate, type SocialPlatform, type ContentItem } from "@/lib/content-store";

export const Route = createFileRoute("/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client — Social Media Connective Admin" },
      { name: "description", content: "Client detail and content management." },
      { property: "og:title", content: "Client — Social Media Connective Admin" },
      { property: "og:description", content: "Client detail and content management." },
    ],
  }),
  component: ClientDetailPage,
});

const statusCards = [
  { key: "Suggested", label: "Suggested Posts", icon: Lightbulb },
  { key: "Additional", label: "Additional Posts", icon: PlusCircle },
  { key: "Submitted", label: "Submitted", icon: Send },
  { key: "Approved", label: "Approved", icon: CheckCircle2 },
  { key: "Deleted", label: "Deleted", icon: Trash2 },
] as const;

const PLATFORM_CONFIG: Record<SocialPlatform, { color: string; icon: string; description: string }> = {
  Facebook: { color: "bg-blue-600", icon: "f", description: "Connect Facebook Pages to publish content and manage posts." },
  Instagram: { color: "bg-gradient-to-br from-purple-600 to-pink-500", icon: "Ig", description: "Connect Instagram Business to publish photos, stories, and reels." },
  YouTube: { color: "bg-red-600", icon: "Yt", description: "Connect YouTube channel to manage videos and playlists." },
  "Google Business Profile": { color: "bg-emerald-600", icon: "G", description: "Connect Google Business Profile to manage local posts and reviews." },
  LinkedIn: { color: "bg-blue-700", icon: "Li", description: "Connect LinkedIn to publish articles and company updates." },
};

const sample: Omit<ContentItem, "id">[] = [
  {
    title: "Hydrafacial: What to Expect",
    client: "Divine Medical Spa",
    platform: "Instagram",
    type: "Image",
    status: "Additional",
    date: new Date().toISOString().slice(0, 10),
    caption: "A quick walkthrough of your first Hydrafacial appointment.",
    hashtags: ["#Hydrafacial", "#SkinCare"],
    cta: "Book your session.",
    media: [
      "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=70",
    ],
  },
  {
    title: "3 Signs You Need a Dental Check-Up",
    client: "Northline Dental",
    platform: "Facebook",
    type: "Text Post",
    status: "Additional",
    date: new Date().toISOString().slice(0, 10),
    caption: "Sensitivity, bleeding gums and jaw pain shouldn't be ignored.",
    body: "Sensitivity, bleeding gums and jaw pain shouldn't be ignored. Here's why an early visit saves time and money.",
    hashtags: ["#DentalHealth", "#Northline"],
    cta: "Schedule a check-up.",
  },
  {
    title: "Why Recovery Days Matter",
    client: "Harbor Fitness Co.",
    platform: "LinkedIn",
    type: "Blog Article",
    status: "Additional",
    date: new Date().toISOString().slice(0, 10),
    caption: "Training hard is only half the equation.",
    body: "Training hard is only half the equation. Recovery is where adaptation happens…",
    hashtags: ["#Fitness", "#Recovery"],
    cta: "Read the full article.",
  },
];

function ImportSection({ clientName }: { clientName: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [rows, setRows] = useState<Omit<ContentItem, "id">[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const ok = /\.(docx|pdf|md)$/i.test(file.name);
    if (!ok) {
      toast.error("Unsupported file. Use .docx, .pdf, or .md");
      return;
    }
    setFileName(file.name);
    setRows(null);
    setUploadProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 20;
      setUploadProgress(p);
      if (p >= 100) {
        clearInterval(t);
        const imported = sample.map((s) => ({ ...s, client: clientName }));
        setRows(imported);
        toast.success(`${file.name} uploaded`);
      }
    }, 160);
  };

  const confirmImport = () => {
    if (!rows) return;
    setImporting(true);
    setImportProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 25;
      setImportProgress(p);
      if (p >= 100) {
        clearInterval(t);
        actions.addMany(rows);
        setImporting(false);
        toast.success(`${rows.length} items imported for ${clientName}`);
        setRows(null);
        setFileName(null);
        setUploadProgress(0);
      }
    }, 180);
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Import Posts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Import existing marketing content for {clientName}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".docx,.pdf,.md"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <UploadCloud className="mr-1.5 size-3.5" />
            Import Posts (.docx, .pdf, .md)
          </Button>
        </div>
      </div>

      {fileName && (
        <div className="mt-3 rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-sm font-medium">{fileName}</span>
            <span className="ml-auto text-xs text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="mt-2 h-1.5" />
        </div>
      )}

      {rows && (
        <section className="mt-4">
          <h3 className="mb-3 text-sm font-semibold">Import Preview</h3>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Content</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>
                      <PlatformBadge platform={r.platform} />
                    </TableCell>
                    <TableCell>
                      <ContentTypeBadge type={r.type} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {importing && <Progress value={importProgress} className="mt-3 h-1.5" />}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRows(null);
                setFileName(null);
                setUploadProgress(0);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={confirmImport} disabled={importing}>
              {importing ? "Importing…" : "Import Content"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function SocialIntegrationCard({
  platform,
  connected,
  accountName,
  onConnect,
  onDisconnect,
}: {
  platform: SocialPlatform;
  connected: boolean;
  accountName?: string | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const config = PLATFORM_CONFIG[platform];

  return (
    <div className={`rounded-xl border p-5 transition-all ${connected ? "border-success/30 bg-success/5" : "border-dashed bg-card hover:border-border/80"}`}>
      <div className="flex items-start gap-4">
        <div className={`flex size-12 items-center justify-center rounded-xl text-sm font-bold text-white ${config.color}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{platform}</h3>
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                <Check className="size-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Not Connected
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
          {connected && accountName && (
            <div className="mt-2 rounded-lg bg-success/5 px-3 py-2">
              <p className="text-xs text-muted-foreground">Connected account</p>
              <p className="text-sm font-medium text-foreground">{accountName}</p>
            </div>
          )}
        </div>
        <div className="shrink-0">
          {connected ? (
            <div className="flex flex-col gap-2">
              <Button variant="destructive" size="sm" onClick={onDisconnect}>
                <Trash2 className="mr-1.5 size-3.5" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={onConnect} className="bg-primary hover:bg-primary/90">
              <Link2 className="mr-1.5 size-3.5" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ clientId }: { clientId: string }) {
  const { clients } = useStore();
  const client = clients.find((c) => c.id === clientId);
  const socialIntegrationsRef = useRef(client?.socialIntegrations || {});

  if (client) {
    socialIntegrationsRef.current = client.socialIntegrations;
  }

  if (!client) return null;

  const handleConnect = (platform: SocialPlatform) => {
    if (platform === "Facebook" || platform === "Instagram") {
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      const baseUrl = platform === "Facebook"
        ? "/api/auth/facebook"
        : "/api/auth/instagram";
      const authUrl = `${baseUrl}?client_id=${clientId}`;

      const popup = window.open(
        authUrl,
        `${platform}_oauth_${clientId}`,
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      const handler = (event: MessageEvent) => {
        const expectedType = `${platform.toLowerCase()}-auth-success`;
        const errorType = `${platform.toLowerCase()}-auth-error`;

        if (event.data?.type === expectedType && event.data.clientId === clientId) {
          actions.updateClient(clientId, {
            socialIntegrations: {
              ...socialIntegrationsRef.current,
              [platform]: {
                connected: true,
                accountName: event.data.user?.name || `${client.name} ${platform}`,
                accountId: event.data.user?.id,
                connectedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                accessToken: event.data.access_token,
                tokenExpiresIn: event.data.expires_in,
                pages: event.data.pages || [],
              },
            },
          });
          toast.success(`${platform} connected successfully!`);
          window.removeEventListener("message", handler);
        } else if (event.data?.type === errorType && event.data.clientId === clientId) {
          toast.error(`Failed to connect ${platform}: ${event.data.error}`);
          window.removeEventListener("message", handler);
        }
      };

      window.addEventListener("message", handler);

      if (popup) {
        const check = setInterval(() => {
          if (popup.closed) {
            clearInterval(check);
            window.removeEventListener("message", handler);
          }
        }, 500);
      }
    } else {
      actions.updateClient(clientId, {
        socialIntegrations: {
          ...socialIntegrationsRef.current,
          [platform]: {
            connected: true,
            accountName: `${client.name} ${platform}`,
            accountId: `${Date.now()}`,
            connectedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          },
        },
      });
      toast.success(`${platform} connected!`);
    }
  };

  const handleDisconnect = (platform: SocialPlatform) => {
    actions.updateClient(clientId, {
      socialIntegrations: {
        ...socialIntegrationsRef.current,
        [platform]: { connected: false },
      },
    });
    toast.success(`${platform} disconnected`);
  };

  const connectedCount = SOCIAL_PLATFORMS.filter(
    (p) => client.socialIntegrations[p]?.connected
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Social Integrations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect social media accounts for {client.name} to enable direct posting and analytics.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-semibold">{connectedCount}</span>
            <p className="text-xs text-muted-foreground">of {SOCIAL_PLATFORMS.length} connected</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((platform) => (
            <SocialIntegrationCard
              key={platform}
              platform={platform}
              connected={client.socialIntegrations[platform]?.connected === true}
              accountName={client.socialIntegrations[platform]?.accountName}
              onConnect={() => handleConnect(platform)}
              onDisconnect={() => handleDisconnect(platform)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold">Posting Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how content is posted to connected platforms.
        </p>
        <div className="mt-4 space-y-3">
          {SOCIAL_PLATFORMS.map((platform) => {
            const isConnected = client.socialIntegrations[platform]?.connected === true;
            return (
              <div key={platform} className={`flex items-center justify-between rounded-lg border p-3 ${isConnected ? "border-success/20 bg-success/5" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex size-8 items-center justify-center rounded-lg ${isConnected ? "bg-success/12" : "bg-muted"}`}>
                    {isConnected ? (
                      <Check className="size-4 text-success" strokeWidth={2} />
                    ) : (
                      <Link2 className="size-4 text-muted-foreground" strokeWidth={1.75} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{platform}</p>
                    <p className="text-xs text-muted-foreground">
                      {isConnected ? (
                        <span className="text-success font-medium">Ready to post</span>
                      ) : (
                        <span className="text-muted-foreground">Not connected</span>
                      )}
                    </p>
                  </div>
                </div>
                {isConnected && (
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="mr-1.5 size-3.5" />
                    Open
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Tab = "content" | "published" | "ai-content" | "media" | "settings";

function PublishedTab({ client }: { client: { id: string; name: string } }) {
  const { content, clients } = useStore();
  const [publishing, setPublishing] = useState(false);

  const publishedContent = content.filter(
    (c) => c.client === client.name && c.status === "Approved" && c.notes?.includes("Post ID:")
  );

  const scheduledContent = content.filter(
    (c) => c.client === client.name && c.status === "Submitted" && c.notes?.includes("Scheduled")
  );

  const handleDeleteFromFacebook = async (item: typeof content[0]) => {
    const postMatch = item.notes?.match(/Post ID: (\d+_\d+)/);
    if (!postMatch) {
      toast.error("No Facebook Post ID found");
      return;
    }

    const postId = postMatch[1];

    const clientData = clients.find((c) => c.name === item.client);
    const fbConnection = clientData?.socialIntegrations?.Facebook;

    if (!fbConnection?.accessToken) {
      toast.error("Facebook access token not found");
      return;
    }

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

  const getPostId = (notes?: string) => {
    const match = notes?.match(/Post ID: (\d+)/);
    return match ? match[1] : null;
  };

  const getPostUrl = (postId: string | null | undefined) => {
    if (!postId) return null;
    return `https://facebook.com/${postId.replace("_", "/posts/")}`;
  };

  return (
    <div className="space-y-6">
      {publishedContent.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Published Posts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Posts that are live on Facebook for {client.name}.
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-semibold">{publishedContent.length}</span>
              <p className="text-xs text-muted-foreground">posts</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {publishedContent.map((item) => {
              const postId = getPostId(item.notes);
              const postUrl = getPostUrl(postId);

              return (
                <div
                  key={item.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{item.title}</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          <Globe className="size-3" /> Live
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {item.caption}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <PlatformBadge platform={item.platform} />
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatDate(item.date)}
                        </span>
                        {postId && (
                          <span className="font-mono text-muted-foreground/70">
                            ID: {postId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {postUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => window.open(postUrl, "_blank")}
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => handleDeleteFromFacebook(item)}
                        disabled={publishing}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scheduledContent.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Scheduled Posts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Posts scheduled for automatic publishing.
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-semibold">{scheduledContent.length}</span>
              <p className="text-xs text-muted-foreground">scheduled</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {scheduledContent.map((item) => {
              const scheduleMatch = item.notes?.match(/Scheduled for (.+?) on/);
              const scheduleTime = scheduleMatch ? scheduleMatch[1] : "Unknown";

              return (
                <div
                  key={item.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{item.title}</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">
                          <CalendarClock className="size-3" /> Scheduled
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {item.caption}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <PlatformBadge platform={item.platform} />
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarClock className="size-3" />
                          {scheduleTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {publishedContent.length === 0 && scheduledContent.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <Globe className="size-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold">No Published Content</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Content published to Facebook will appear here.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/content/create">Create Content</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function MediaTab({ client }: { client: { id: string; name: string } }) {
  const { content } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "images" | "videos">("all");

  const allMedia = content
    .filter((c) => c.client === client.name && c.media && c.media.length > 0)
    .flatMap((c) =>
      (c.media || []).map((url) => ({
        id: `${c.id}-${url}`,
        url,
        title: c.title,
        type: url.match(/\.(mp4|mov|avi|webm)$/i) ? "video" : "image",
      }))
    );

  const filteredMedia = allMedia.filter((m) => {
    if (filter === "images") return m.type === "image";
    if (filter === "videos") return m.type === "video";
    return true;
  });

  const images = filteredMedia.filter((m) => m.type === "image");
  const videos = filteredMedia.filter((m) => m.type === "video");

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMedia.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMedia.map((m) => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = () => {
    toast.success(`${selectedIds.length} media deleted`);
    setSelectedIds([]);
  };

  const handleAddImages = (files: FileList | null) => {
    const fileList = Array.from(files || []);
    const validFiles = fileList.filter((f) => /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi)$/i.test(f.name));
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} files added`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Media Library</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All media files for {client.name}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleAddImages(e.target.files)}
            />
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <PlusCircle className="mr-1.5 size-3.5" />
              Add Images
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({allMedia.length})
            </button>
            <button
              onClick={() => setFilter("images")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "images"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Image className="mr-1 inline size-3" />
              Images ({images.length})
            </button>
            <button
              onClick={() => setFilter("videos")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "videos"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Film className="mr-1 inline size-3" />
              Videos ({videos.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredMedia.length && filteredMedia.length > 0}
                onChange={toggleSelectAll}
                className="size-4 rounded border-gray-300"
              />
              Select All
            </label>
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected}>
                <Trash2 className="mr-1.5 size-3.5" />
                Delete ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>

        {filteredMedia.length > 0 ? (
          <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {filteredMedia.map((media) => (
              <div
                key={media.id}
                className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                  selectedIds.includes(media.id)
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent hover:border-border"
                }`}
                onClick={() => toggleSelect(media.id)}
              >
                <div className="aspect-square bg-muted">
                  {media.type === "image" ? (
                    <img
                      src={media.url}
                      alt={media.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Film className="size-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 flex items-start justify-end p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <div
                    className={`flex size-6 items-center justify-center rounded-full ${
                      selectedIds.includes(media.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/80 text-foreground"
                    }`}
                  >
                    {selectedIds.includes(media.id) && <Check className="size-4" />}
                  </div>
                </div>
                {media.type === "video" && (
                  <div className="absolute bottom-2 left-2">
                    <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                      <Film className="size-3" /> Video
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <Image className="size-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold">No Media Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add images or videos for {client.name}.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
              <PlusCircle className="mr-1.5 size-3.5" />
              Add Media
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AIContentTab({ client }: { client: { id: string; name: string } }) {
  const { content } = useStore();
  const navigate = useNavigate();

  const aiContent = content.filter(
    (c) => c.client === client.name && c.notes?.toLowerCase().includes("generated by ai")
  );

  const suggestedContent = content.filter(
    (c) => c.client === client.name && c.status === "Suggested"
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">AI Generated Content</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Content created using AI for {client.name}.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/content/create">
              <Sparkles className="mr-1.5 size-3.5" />
              Generate New
            </Link>
          </Button>
        </div>

        {aiContent.length > 0 ? (
          <div className="mt-6 space-y-4">
            {aiContent.map((item) => (
              <div
                key={item.id}
                className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/30"
                onClick={() => navigate({ to: "/content" })}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">{item.title}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-600">
                        <Sparkles className="size-3" /> AI
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.caption}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <PlatformBadge platform={item.platform} />
                      <ContentTypeBadge type={item.type} />
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDate(item.date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="size-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold">No AI Content Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate marketing content using AI for {client.name}.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/content/create">Generate Content</Link>
            </Button>
          </div>
        )}
      </div>

      {suggestedContent.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Suggested Posts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Content suggestions ready for review.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {suggestedContent.map((item) => (
              <div
                key={item.id}
                className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/30"
                onClick={() => navigate({ to: "/content" })}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">{item.title}</h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.caption}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <PlatformBadge platform={item.platform} />
                      <ContentTypeBadge type={item.type} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const { clients, content } = useStore();
  const client = clients.find((c) => c.id === clientId);
  const [tab, setTab] = useState<Tab>("content");

  if (!client) {
    return (
      <>
        <PageHeader title="Client Not Found" subtitle="This client doesn't exist." />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            The client you're looking for doesn't exist or has been deleted.
          </p>
          <Button asChild className="mt-4">
            <Link to="/clients">Back to Clients</Link>
          </Button>
        </div>
      </>
    );
  }

  const clientContent = content.filter((c) => c.client === client.name);
  const c = counts(clientContent);

  return (
    <>
      <div className="mb-6">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Clients
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <ClientStatusBadge active={client.active} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {client.platforms.length > 0 ? (
              client.platforms.map((p) => <PlatformBadge key={p} platform={p} />)
            ) : (
              <span className="text-sm text-muted-foreground">No platforms assigned</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/content/create">Create Content</Link>
          </Button>
        </div>
      </div>

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
          onClick={() => setTab("published")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "published"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="size-4" />
          Published
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
        <button
          onClick={() => setTab("media")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "media"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Image className="size-4" />
          Media
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "settings"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="size-4" />
          Settings
        </button>
      </div>

      {tab === "content" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {statusCards.map((card) => (
              <div
                key={card.key}
                className="rounded-xl border bg-card p-4 shadow-soft"
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl font-semibold tabular-nums">{c[card.key]}</span>
                  <card.icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{card.label}</p>
                <div className="mt-3 h-1 rounded-full bg-muted">
                  <div
                    className="h-1 rounded-full bg-primary/70"
                    style={{
                      width: `${clientContent.length ? Math.max(6, (c[card.key] / clientContent.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <ImportSection clientName={client.name} />
          </div>

          <section className="mt-10">
            <h2 className="mb-4 text-base font-semibold">All Content</h2>
            <ContentList clientFilter={client.name} showClientFilter={false} emptyMessage={`No content for ${client.name} yet.`} />
          </section>
        </>
      )}

      {tab === "settings" && <SettingsTab clientId={client.id} />}

      {tab === "published" && <PublishedTab client={client} />}

      {tab === "ai-content" && <AIContentTab client={client} />}

      {tab === "media" && <MediaTab client={client} />}
    </>
  );
}
