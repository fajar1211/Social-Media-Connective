import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { ContentList } from "@/components/content-list";
import { counts, useStore } from "@/lib/content-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/additional")({
  head: () => ({
    meta: [
      { title: "Additional Posts — Social Media Connective Admin" },
      {
        name: "description",
        content: "Additional marketing content added to the content library.",
      },
      { property: "og:title", content: "Additional Posts — Social Media Connective Admin" },
      {
        property: "og:description",
        content: "Additional marketing content added to the content library.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { content } = useStore();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  return (
    <>
      <PageHeader
        title={`Additional Posts (${counts(content).Additional})`}
        subtitle="Additional marketing content added to the content library."
      />
      <ContentList status="Additional" emptyMessage="No additional posts yet." showCheckboxes={isAdmin} />
    </>
  );
}
