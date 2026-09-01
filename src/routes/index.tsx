import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lightbulb, PlusCircle, Send, CheckCircle2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ContentTable } from "@/components/content-list";
import { ContentDetailOverlay } from "@/components/content-detail-overlay";
import { EmptyState } from "@/components/empty-state";
import { counts, useStore, type ContentItem } from "@/lib/content-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Social Media Connective Admin" },
      {
        name: "description",
        content:
          "Create, import, review and approve marketing content in one simple admin dashboard.",
      },
      { property: "og:title", content: "Dashboard — Social Media Connective Admin" },
      {
        property: "og:description",
        content: "Manage and organize your marketing content in one place.",
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
  const { content } = useStore();
  const c = counts(content);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const current = selected ? (content.find((i) => i.id === selected.id) ?? null) : null;
  const recent = [...content]
    .filter((i) => i.status !== "Deleted")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Manage and organize your marketing content in one place."
        actions={
          <Button asChild>
            <Link to="/content/create">Create Content</Link>
          </Button>
        }
      />

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
