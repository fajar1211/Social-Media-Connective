import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ContentList } from "@/components/content-list";

export const Route = createFileRoute("/content/")({
  head: () => ({
    meta: [
      { title: "All Content — Social Media Connective Admin" },
      { name: "description", content: "Browse, filter and review all marketing content." },
      { property: "og:title", content: "All Content — Social Media Connective Admin" },
      { property: "og:description", content: "Browse, filter and review all marketing content." },
    ],
  }),
  component: AllContent,
});

function AllContent() {
  return (
    <>
      <PageHeader
        title="All Content"
        subtitle="Every piece of marketing content in your library."
        actions={
          <Button asChild>
            <Link to="/content/create">Create Content</Link>
          </Button>
        }
      />
      <ContentList />
    </>
  );
}
