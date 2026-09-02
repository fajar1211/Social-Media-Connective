import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lightbulb, PlusCircle, Send, CheckCircle2, Trash2, Users, Shield, Building2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ContentTable } from "@/components/content-list";
import { ContentDetailOverlay } from "@/components/content-detail-overlay";
import { EmptyState } from "@/components/empty-state";
import { counts, useStore, type ContentItem } from "@/lib/content-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Social Media Connective" },
      {
        name: "description",
        content:
          "Create, import, review and approve marketing content in one simple dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

const cards = [
  { key: "Suggested", label: "Suggested Posts", icon: Lightbulb, to: "/suggested" },
  { key: "Additional", label: "Additional Posts", icon: PlusCircle, to: "/additional" },
  { key: "Submitted", label: "Submitted", icon: Send, to: "/submitted" },
  { key: "Approved", label: "Approved", icon: CheckCircle2, to: "/approved" },
  { key: "Deleted", label: "Deleted", icon: Trash2, to: "/deleted" },
] as const;

function Dashboard() {
  const { content, clients } = useStore();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Client with assigned clientId → redirect to their client page
  useEffect(() => {
    if (profile?.role === "client" && profile?.clientId) {
      navigate({ to: "/clients/$clientId", params: { clientId: profile.clientId }, replace: true });
    }
  }, [profile, navigate]);

  const c = counts(content);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const current = selected ? (content.find((i) => i.id === selected.id) ?? null) : null;
  const recent = [...content]
    .filter((i) => i.status !== "Deleted")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const isAdmin = profile?.role === "admin";
  const isClient = profile?.role === "client";
  const hasClient = isClient && !!profile?.clientId;
  const userName = profile?.fullName || "User";

  // Client without a client assigned - show setup prompt
  if (isClient && !hasClient) {
    return (
      <>
        <PageHeader
          title={`Welcome, ${userName}`}
          subtitle="Set up your profile to get started."
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-20 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="size-7 text-primary" />
          </div>
          <p className="text-base font-medium">No Profile Yet</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            You need to set up your profile before you can manage content.
            Please contact your admin to assign you, or create one below.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/clients">Set Up Profile</Link>
          </Button>
        </div>
      </>
    );
  }

  const clientName = isClient && profile?.clientId
    ? clients.find((cl) => cl.id === profile.clientId)?.name || "your client"
    : "all clients";

  return (
    <>
      <PageHeader
        title={`Welcome, ${userName}`}
        subtitle={
          isAdmin
            ? "You have full access to all clients and content."
            : `Managing content for ${clientName}.`
        }
        actions={
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/content/create">Create Content</Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="outline">
                <Link to="/users">
                  <Shield className="mr-2 size-4" />
                  Manage Users
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {isAdmin && (
        <div className="mb-6 rounded-xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Shield className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Admin Access</p>
                <p className="text-xs text-muted-foreground">
                  You can manage all clients, users, and content across the platform.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/clients">View Clients</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/users">Manage Users</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.key}
            to={card.to}
            className="rounded-xl border bg-card p-4 shadow-soft transition-colors hover:bg-accent/40"
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
                  width: `${content.length ? Math.max(6, (c[card.key] / content.length) * 100) : 0}%`,
                }}
              />
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Content</h2>
          <Link to="/content" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {recent.length ? (
          <ContentTable items={recent} onSelect={setSelected} />
        ) : (
          <EmptyState />
        )}
      </section>

      <ContentDetailOverlay item={current} onClose={() => setSelected(null)} />
    </>
  );
}
