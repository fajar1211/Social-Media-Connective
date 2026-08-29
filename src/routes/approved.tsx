import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { ContentList } from "@/components/content-list";
import { counts, useStore } from "@/lib/content-store";

export const Route = createFileRoute("/approved")({
  head: () => ({
    meta: [
      { title: "Approved — Social Media Connective Admin" },
      { name: "description", content: "Marketing content that has been approved." },
      { property: "og:title", content: "Approved — Social Media Connective Admin" },
      { property: "og:description", content: "Marketing content that has been approved." },
    ],
  }),
  component: Page,
});

function Page() {
  const { content } = useStore();
  return (
    <>
      <PageHeader
        title={`Approved (${counts(content).Approved})`}
        subtitle="Content that has been approved."
      />
      <ContentList status="Approved" emptyMessage="No approved content yet." />
    </>
  );
}
