import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { ContentList } from "@/components/content-list";
import { counts, useStore } from "@/lib/content-store";

export const Route = createFileRoute("/submitted")({
  head: () => ({
    meta: [
      { title: "Submitted — Social Media Connective Admin" },
      { name: "description", content: "Marketing content submitted for review." },
      { property: "og:title", content: "Submitted — Social Media Connective Admin" },
      { property: "og:description", content: "Marketing content submitted for review." },
    ],
  }),
  component: Page,
});

function Page() {
  const { content } = useStore();
  return (
    <>
      <PageHeader
        title={`Submitted (${counts(content).Submitted})`}
        subtitle="Content submitted for review."
      />
      <ContentList status="Submitted" emptyMessage="No submitted content yet." dateLabel="Submitted Date" />
    </>
  );
}
