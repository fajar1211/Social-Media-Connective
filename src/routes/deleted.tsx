import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { ContentList } from "@/components/content-list";
import { counts, useStore } from "@/lib/content-store";

export const Route = createFileRoute("/deleted")({
  head: () => ({
    meta: [
      { title: "Deleted — Social Media Connective Admin" },
      { name: "description", content: "Deleted marketing content, restorable at any time." },
      { property: "og:title", content: "Deleted — Social Media Connective Admin" },
      { property: "og:description", content: "Deleted marketing content, restorable at any time." },
    ],
  }),
  component: Page,
});

function Page() {
  const { content } = useStore();
  return (
    <>
      <PageHeader
        title={`Deleted (${counts(content).Deleted})`}
        subtitle="Deleted marketing content. Open an item to restore or permanently delete it."
      />
      <ContentList status="Deleted" emptyMessage="No deleted content." />
    </>
  );
}
