import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

export function EmptyState({
  message = "No content yet",
  ctaLabel = "Create Content",
  to = "/content/create",
}: {
  message?: string;
  ctaLabel?: string | null;
  to?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-5 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium">{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Content you create or import will appear here.
      </p>
      {ctaLabel ? (
        <Button asChild className="mt-6">
          <Link to={to}>{ctaLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
