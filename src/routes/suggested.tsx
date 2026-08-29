import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { ContentList } from "@/components/content-list";
import { counts, useStore } from "@/lib/content-store";

export const Route = createFileRoute("/suggested")({
  head: () => ({
    meta: [
      { title: "Suggested Posts — Social Media Connective Admin" },
      { name: "description", content: "Content suggestions ready for review." },
      { property: "og:title", content: "Suggested Posts — Social Media Connective Admin" },
      { property: "og:description", content: "Content suggestions ready for review." },
    ],
  }),
  component: Page,
});

function Page() {
  const { content } = useStore();
  return (
    <>
      <PageHeader
        title={`Suggested Posts (${counts(content).Suggested})`}
        subtitle="Content suggestions ready for review."
      />
      <ContentList status="Suggested" emptyMessage="No suggested posts yet." />
    </>
  );
}
