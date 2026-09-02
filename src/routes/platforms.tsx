import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Link2,
  Unlink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
  Shield,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { actions, useStore, type SocialConnection, type FacebookPage } from "@/lib/content-store";

export const Route = createFileRoute("/platforms")({
  head: () => ({
    meta: [
      { title: "Platforms — Social Media Connective" },
      { name: "description", content: "Manage platform connections and integrations." },
      { property: "og:title", content: "Platforms — Social Media Connective" },
    ],
  }),
  component: PlatformsPage,
});

type PlatformConfig = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  scopes: string[];
  authUrl: string;
  callbackType: "facebook" | "instagram";
};

const PLATFORMS: PlatformConfig[] = [
  {
    id: "facebook",
    name: "Facebook",
    description: "Connect Facebook Pages to publish posts and manage content.",
    icon: "📘",
    color: "#1877F2",
    scopes: ["pages_show_list", "pages_manage_posts", "pages_read_engagement"],
    authUrl: "/api/auth/facebook",
    callbackType: "facebook",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Connect Instagram Business accounts to publish photos and reels.",
    icon: "📸",
    color: "#E4405F",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    authUrl: "/api/auth/instagram",
    callbackType: "instagram",
  },
];

function ConnectionCard({
  platform,
  client,
  connection,
  onConnect,
  onDisconnect,
}: {
  platform: PlatformConfig;
  client: { id: string; name: string };
  connection?: SocialConnection;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const isConnected = connection?.connected ?? false;

  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: platform.color }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{platform.icon}</span>
            <div>
              <CardTitle className="text-base">{platform.name}</CardTitle>
              <CardDescription className="text-xs">
                {platform.description}
              </CardDescription>
            </div>
          </div>
          {isConnected ? (
            <Badge variant="default" className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
              <CheckCircle2 className="size-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="size-3" />
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected && connection ? (
          <div className="space-y-3">
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{connection.accountName || "Connected Account"}</p>
              {connection.accountId && (
                <p className="text-xs text-muted-foreground">ID: {connection.accountId}</p>
              )}
              {connection.connectedAt && (
                <p className="text-xs text-muted-foreground">
                  Connected: {new Date(connection.connectedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            {connection.pages && connection.pages.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pages ({connection.pages.length})
                </p>
                <div className="space-y-1.5">
                  {connection.pages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{page.name}</p>
                        <p className="text-xs text-muted-foreground">{page.category || "Page"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onConnect}
                className="flex-1"
              >
                <RefreshCw className="mr-2 size-3" />
                Reconnect
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onDisconnect}
                className="flex-1"
              >
                <Unlink className="mr-2 size-3" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              <p>Connect your {platform.name} account to start publishing content.</p>
            </div>
            <Button onClick={onConnect} className="w-full" style={{ backgroundColor: platform.color }}>
              <Link2 className="mr-2 size-4" />
              Connect {platform.name}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformsPage() {
  const { profile } = useAuth();
  const { clients } = useStore();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [connections, setConnections] = useState<Record<string, SocialConnection>>({});
  const [loading, setLoading] = useState(false);
  const [reconnectPlatform, setReconnectPlatform] = useState<PlatformConfig | null>(null);

  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (!selectedClientId || !supabaseConfigured) {
      // Load from local store
      const client = clients.find((c) => c.id === selectedClientId);
      if (client) {
        setConnections(client.socialIntegrations || {});
      }
      return;
    }

    loadConnections();
  }, [selectedClientId]);

  const loadConnections = async () => {
    if (!supabaseConfigured || !selectedClientId) return;

    setLoading(true);
    const { data } = await supabase
      .from("social_connections")
      .select("*")
      .eq("client_id", selectedClientId);

    if (data) {
      const mapped: Record<string, SocialConnection> = {};
      for (const item of data) {
        mapped[item.platform] = {
          connected: true,
          accountName: item.account_name || undefined,
          accountId: item.account_id || undefined,
          connectedAt: item.created_at,
          accessToken: item.access_token || undefined,
          tokenExpiresIn: item.token_expires_in || undefined,
          pages: (item.pages as FacebookPage[]) || [],
        };
      }
      setConnections(mapped);
    }
    setLoading(false);
  };

  const handleConnect = (platform: PlatformConfig) => {
    if (!selectedClientId) {
      toast.error("Please select a client first");
      return;
    }

    const popup = window.open(
      `${platform.authUrl}?client_id=${selectedClientId}&role=${profile?.role || 'client'}`,
      `${platform.id}-auth`,
      "width=600,height=700,scrollbars=yes"
    );

    const handler = async (event: MessageEvent) => {
      if (event.data?.type === `${platform.callbackType}-auth-success` && event.data.clientId === selectedClientId) {
        const connection: SocialConnection = {
          connected: true,
          accountName: event.data.user?.name || event.data.pages?.[0]?.name,
          accountId: event.data.user?.id,
          connectedAt: new Date().toISOString(),
          accessToken: event.data.access_token,
          tokenExpiresIn: event.data.expires_in,
          pages: event.data.pages || [],
        };

        // Save to Supabase
        if (supabaseConfigured) {
          for (const page of connection.pages || []) {
            await supabase.from("social_connections").upsert(
              {
                client_id: selectedClientId,
                platform: platform.id,
                account_id: page.id,
                account_name: page.name,
                access_token: page.access_token,
                token_expires_in: connection.tokenExpiresIn || 0,
                pages: connection.pages,
              },
              { onConflict: "client_id,platform" }
            );
          }

          if (!connection.pages || connection.pages.length === 0) {
            await supabase.from("social_connections").upsert(
              {
                client_id: selectedClientId,
                platform: platform.id,
                account_id: connection.accountId,
                account_name: connection.accountName,
                access_token: connection.accessToken,
                token_expires_in: connection.tokenExpiresIn || 0,
                pages: [],
              },
              { onConflict: "client_id,platform" }
            );
          }
        }

        // Update local store
        actions.updateClient(selectedClientId, {
          socialIntegrations: {
            ...connections,
            [platform.id]: connection,
          },
        });

        setConnections((prev) => ({ ...prev, [platform.id]: connection }));
        toast.success(`${platform.name} connected successfully!`);
        popup?.close();
      }

      if (event.data?.type === `${platform.callbackType}-auth-error`) {
        toast.error(`Failed to connect ${platform.name}: ${event.data.error}`);
        popup?.close();
      }
    };

    window.addEventListener("message", handler);

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        window.removeEventListener("message", handler);
        clearInterval(checkClosed);
      }
    }, 500);
  };

  const handleDisconnect = async (platform: PlatformConfig) => {
    if (!selectedClientId) return;

    if (supabaseConfigured) {
      await supabase
        .from("social_connections")
        .delete()
        .eq("client_id", selectedClientId)
        .eq("platform", platform.id);
    }

    const updated = { ...connections };
    delete updated[platform.id];

    actions.updateClient(selectedClientId, {
      socialIntegrations: updated,
    });

    setConnections(updated);
    toast.success(`${platform.name} disconnected`);
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <>
      <PageHeader
        title="Platform Connections"
        subtitle="Connect social media accounts to publish content directly."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Client:</span>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {!selectedClientId ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <Shield className="mb-4 size-11 text-muted-foreground" strokeWidth={1.75} />
          <p className="text-sm font-medium">Select a client</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a client to manage their platform connections.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {selectedClient && (
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm font-medium">
                Managing connections for: <span className="text-primary">{selectedClient.name}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Connect social media accounts to enable direct publishing for this client.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {PLATFORMS.map((platform) => (
              <ConnectionCard
                key={platform.id}
                platform={platform}
                client={selectedClient!}
                connection={connections[platform.id]}
                onConnect={() => handleConnect(platform)}
                onDisconnect={() => handleDisconnect(platform)}
              />
            ))}
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="text-sm font-medium">Need more platforms?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              We're working on adding support for LinkedIn, YouTube, TikTok, and more.
              Stay tuned for updates.
            </p>
          </div>
        </div>
      )}

      <Dialog open={!!reconnectPlatform} onOpenChange={(o) => !o && setReconnectPlatform(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconnect {reconnectPlatform?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will re-authenticate your {reconnectPlatform?.name} connection. Your existing
            content will not be affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconnectPlatform(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (reconnectPlatform) {
                handleConnect(reconnectPlatform);
                setReconnectPlatform(null);
              }
            }}>
              Reconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
