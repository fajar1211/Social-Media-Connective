import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { ContentTable } from "@/components/content-list";
import { ContentDetailOverlay } from "@/components/content-detail-overlay";
import { EmptyState } from "@/components/empty-state";
import { counts, useStore, type ContentItem } from "@/lib/content-store";
import * as db from "@/lib/db";

type ClientInfo = {
  id: string;
  name: string;
  active: boolean;
};

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

  const clientContent = content.filter((c) => c.clientId === clientInfo.id);
  const c = counts(clientContent);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">{clientInfo.name}</h1>
            <p className="text-sm text-muted-foreground">Content Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-3 text-sm">
              <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                {c.Suggested} Suggested
              </span>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 font-medium text-blue-600">
                {c.Submitted} Submitted
              </span>
              <span className="rounded-full bg-green-500/10 px-3 py-1 font-medium text-green-600">
                {c.Approved} Approved
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <section>
          <h2 className="mb-4 text-lg font-semibold">All Content</h2>
          {clientContent.length > 0 ? (
            <ContentTable items={clientContent} onSelect={setSelected} />
          ) : (
            <EmptyState />
          )}
        </section>
      </main>

      <ContentDetailOverlay item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
