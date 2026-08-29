import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";
import { ContentTypeBadge, platformIcons } from "@/components/badges";
import { actions, useStore } from "@/lib/content-store";

export const Route = createFileRoute("/platforms")({
  head: () => ({
    meta: [
      { title: "Platforms — Social Media Connective Admin" },
      { name: "description", content: "Enable platforms and review supported content types." },
      { property: "og:title", content: "Platforms — Social Media Connective Admin" },
      {
        property: "og:description",
        content: "Enable platforms and review supported content types.",
      },
    ],
  }),
  component: PlatformsPage,
});

function PlatformsPage() {
  const { platforms } = useStore();
  return (
    <>
      <PageHeader
        title="Platforms"
        subtitle="Enable the platforms your team creates content for."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {platforms.map((p) => {
          const Icon = platformIcons[p.name];
          return (
            <div key={p.name} className="rounded-xl border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.enabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={p.enabled}
                  onCheckedChange={() => {
                    actions.togglePlatform(p.name);
                    toast.success(`${p.name} ${p.enabled ? "disabled" : "enabled"}`);
                  }}
                  aria-label={`Toggle ${p.name}`}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.types.map((t) => (
                  <ContentTypeBadge key={t} type={t} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
