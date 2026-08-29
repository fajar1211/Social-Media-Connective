import { cn } from "@/lib/utils";
import type { ContentType, Platform, Status } from "@/lib/content-store";
import { Facebook, Instagram, Linkedin, FileText, Twitter } from "lucide-react";

const base =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export const platformIcons: Record<Platform, React.ElementType> = {
  Facebook: Facebook,
  Instagram: Instagram,
  "X / Twitter": Twitter,
  LinkedIn: Linkedin,
  Blog: FileText,
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  const Icon = platformIcons[platform];
  return (
    <span className={cn(base, "border-border bg-card text-muted-foreground")}>
      <Icon className="size-3.5" strokeWidth={1.75} />
      {platform}
    </span>
  );
}

export function ContentTypeBadge({ type }: { type: ContentType }) {
  return <span className={cn(base, "border-transparent bg-muted text-secondary-foreground")}>{type}</span>;
}

const statusStyles: Record<Status, string> = {
  Suggested: "border-border bg-card text-muted-foreground",
  Additional: "border-border bg-card text-muted-foreground",
  Submitted: "border-transparent bg-primary-soft text-accent-foreground",
  Approved: "border-transparent bg-success/12 text-success",
  Deleted: "border-transparent bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn(base, statusStyles[status])}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

const clientStatusStyles: Record<string, string> = {
  Active: "border-transparent bg-success/12 text-success",
  Inactive: "border-transparent bg-muted text-muted-foreground",
};

export function ClientStatusBadge({ active }: { active: boolean }) {
  const label = active ? "Active" : "Inactive";
  return (
    <span className={cn(base, clientStatusStyles[label])}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
