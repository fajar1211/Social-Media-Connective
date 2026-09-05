import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect, useReducer } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Lightbulb,
  PlusCircle,
  Send,
  CheckCircle2,
  Trash2,
  UploadCloud,
  FileSpreadsheet,
  Link2,
  Settings,
  LayoutGrid,
  Check,
  ExternalLink,
  Globe,
  Clock,
  CalendarClock,
  Sparkles,
  Image,
  Film,
  SquareCheck,
  User,
  Mail,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientStatusBadge, PlatformBadge, ContentTypeBadge, StatusBadge } from "@/components/badges";
import { ContentList } from "@/components/content-list";
import { counts, useStore, actions, getStoreState, SOCIAL_PLATFORMS, formatDate, parseImportFile, type SocialPlatform, type ContentItem } from "@/lib/content-store";
import * as db from "@/lib/db";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client — Social Media Connective Admin" },
      { name: "description", content: "Client detail and content management." },
      { property: "og:title", content: "Client — Social Media Connective Admin" },
      { property: "og:description", content: "Client detail and content management." },
    ],
  }),
  component: ClientDetailPage,
});

const statusCards = [
  { key: "Suggested", label: "Suggested Posts", icon: Lightbulb },
  { key: "Additional", label: "Additional Posts", icon: PlusCircle },
  { key: "Submitted", label: "Submitted", icon: Send },
  { key: "Approved", label: "Approved", icon: CheckCircle2 },
  { key: "Deleted", label: "Deleted", icon: Trash2 },
] as const;

const PLATFORM_CONFIG: Record<SocialPlatform, { color: string; icon: React.ReactNode; description: string; comingSoon?: boolean }> = {
  Facebook: {
    color: "bg-[#1877F2]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    description: "Connect Facebook Pages to publish content and manage posts.",
  },
  Instagram: {
    color: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    description: "Connect Instagram Business to publish photos, stories, and reels.",
  },
  YouTube: {
    color: "bg-[#FF0000]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    description: "Connect YouTube channel to manage videos and playlists.",
    comingSoon: true,
  },
  GBP: {
    color: "bg-[#4285F4]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    description: "Manage local posts and reviews.",
    comingSoon: true,
  },
  LinkedIn: {
    color: "bg-[#0A66C2]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    description: "Publish articles and company updates.",
    comingSoon: true,
  },
  Blog: {
    color: "bg-[#21759B]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.009 12c0-1.298.283-2.532.784-3.648L7.694 19.09A8.013 8.013 0 013.009 12zm8.991 9c-.962 0-1.896-.14-2.785-.401l2.965-8.64 3.042 8.345a.588.588 0 00.046.093A7.987 7.987 0 0112 21zm1.251-13.368l-3.468 10.114a.532.532 0 01-.031.078 7.955 7.955 0 01-2.245-5.435c0-3.309 2.577-6.037 5.812-6.32l-.068 1.563zm5.037-1.611L13.338 18.8a7.96 7.96 0 012.377.238c.339-.825.53-1.726.53-2.675 0-2.421-1.318-4.536-3.281-5.673l-.031-.042z"/>
      </svg>
    ),
    description: "Publish blog articles via WordPress.",
    comingSoon: true,
  },
  TikTok: {
    color: "bg-[#000000]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.16 8.16 0 005.58 2.18V12a4.85 4.85 0 01-3.58-1.48V6.69h3.58z"/>
      </svg>
    ),
    description: "Publish short-form videos on TikTok.",
    comingSoon: true,
  },
  Xiaohongshu: {
    color: "bg-[#FE2C55]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-8h2v8zm-2-10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
      </svg>
    ),
    description: "Share content on Xiaohongshu (Little Red Book).",
    comingSoon: true,
  },
  Reddit: {
    color: "bg-[#FF4500]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    ),
    description: "Share content on Reddit communities.",
    comingSoon: true,
  },
  Threads: {
    color: "bg-[#000000]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.813-1.79-.128 2.754-1.19 5.072-3.988 5.072-.037 0-.075 0-.112-.002-2.92-.105-4.944-1.548-5.042-4.01a4.18 4.18 0 0 1 1.772-3.557c1.032-.815 2.364-1.232 3.736-1.172 2.028.09 3.708.976 4.814 2.534l1.83-1.15c-1.438-2.093-3.616-3.31-6.35-3.424-.86-.036-1.695.06-2.481.286a6.18 6.18 0 0 0-3.56 2.634 6.248 6.248 0 0 0-.657 4.867c.42 1.59 1.468 2.86 2.954 3.623 1.28.662 2.765.967 4.284.897.067.364.103.74.103 1.124 0 .394-.038.782-.113 1.162-.24 1.213-.82 2.263-1.68 3.037-1.098.986-2.57 1.53-4.45 1.644zm3.144-7.844c-.03.276-.11.525-.242.746-.31.514-.849.76-1.617.76-.094 0-.19-.004-.286-.012-.314-.027-.635-.088-.962-.184 0 0-.012-.004-.012-.01a.338.338 0 0 1-.02-.118c.028-2.636 1.942-4.322 5.006-4.322.048 0 .096.002.144.004-.974.544-1.682 1.462-2.01 2.138z"/>
      </svg>
    ),
    description: "Publish text-based posts on Threads.",
    comingSoon: true,
  },
  "X (Twitter)": {
    color: "bg-[#000000]",
    icon: (
      <svg className="size-6 fill-white" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    description: "Post short-form content on X (Twitter).",
    comingSoon: true,
  },
};

function ImportSection({ clientName, clientId }: { clientName: string; clientId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [rows, setRows] = useState<Omit<ContentItem, "id">[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const ok = /\.(docx|pdf|md|txt)$/i.test(file.name);
    if (!ok) {
      toast.error("Unsupported file. Use .docx, .pdf, .md, or .txt");
      return;
    }
    setFileName(file.name);
    setRows(null);
    setUploadProgress(0);
    setSelected(new Set());

    const isText = /\.(md|txt)$/i.test(file.name);
    if (isText) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseImportFile(text, clientName, clientId);
        setRows(parsed);
        setUploadProgress(100);
        toast.success(`${file.name} parsed — ${parsed.length} posts found`);
      };
      reader.readAsText(file);
    } else {
      let p = 0;
      const t = setInterval(() => {
        p += 20;
        setUploadProgress(p);
        if (p >= 100) {
          clearInterval(t);
          setRows([]);
          toast.success(`${file.name} uploaded — 0 posts found`);
        }
      }, 160);
    }
  };

  const confirmImport = () => {
    if (!rows || selected.size === 0) return;
    const selectedRows = rows.filter((_, i) => selected.has(i));
    setImporting(true);
    setImportProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 25;
      setImportProgress(p);
      if (p >= 100) {
        clearInterval(t);
        actions.addMany(selectedRows);
        setImporting(false);
        toast.success(`${selectedRows.length} items imported for ${clientName}`);
        setRows(null);
        setFileName(null);
        setUploadProgress(0);
        setSelected(new Set());
      }
    }, 180);
  };

  const toggleSelect = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const toggleAll = () => {
    if (!rows) return;
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((_, i) => i)));
  };

  const deleteSelected = () => {
    if (!rows) return;
    const count = selected.size;
    setRows(rows.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
    toast.success(`${count} posts removed`);
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Import Posts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Import existing marketing content for {clientName}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".docx,.pdf,.md,.txt"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <UploadCloud className="mr-1.5 size-3.5" />
            Import Posts (.md, .txt)
          </Button>
        </div>
      </div>

      {fileName && (
        <div className="mt-3 rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-sm font-medium">{fileName}</span>
            <span className="ml-auto text-xs text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="mt-2 h-1.5" />
        </div>
      )}

      {rows && (
        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Import Preview ({rows.length} posts)</h3>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <Button variant="destructive" size="sm" onClick={deleteSelected}>
                  <Trash2 className="mr-1 size-3" />
                  Delete Selected ({selected.size})
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-muted-foreground/25"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="size-4 rounded border-muted-foreground/25"
                        checked={selected.has(i)}
                        onChange={() => toggleSelect(i)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>
                      <PlatformBadge platform={r.platform} />
                    </TableCell>
                    <TableCell>
                      <ContentTypeBadge type={r.type} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setViewingIndex(i)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {importing && <Progress value={importProgress} className="mt-3 h-1.5" />}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRows(null);
                setFileName(null);
                setUploadProgress(0);
                setSelected(new Set());
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={confirmImport} disabled={importing || selected.size === 0}>
              {importing ? "Importing…" : `Import ${selected.size} Posts`}
            </Button>
          </div>
        </section>
      )}

      <Dialog open={viewingIndex !== null} onOpenChange={(open) => { if (!open) setViewingIndex(null); }}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          {viewingIndex !== null && rows?.[viewingIndex] && (
            <>
              <DialogHeader>
                <DialogTitle>{rows[viewingIndex].title}</DialogTitle>
                <DialogDescription>{rows[viewingIndex].date} — {rows[viewingIndex].platform}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Type:</span>
                  <ContentTypeBadge type={rows[viewingIndex].type} />
                </div>
                <div>
                  <span className="text-muted-foreground">Caption:</span>
                  <p className="mt-1 whitespace-pre-wrap">{rows[viewingIndex].caption}</p>
                </div>
                {rows[viewingIndex].body && rows[viewingIndex].body !== rows[viewingIndex].caption && (
                  <div>
                    <span className="text-muted-foreground">Body:</span>
                    <p className="mt-1 whitespace-pre-wrap">{rows[viewingIndex].body}</p>
                  </div>
                )}
                {rows[viewingIndex].hashtags.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Hashtags:</span>
                    <p className="mt-1">{rows[viewingIndex].hashtags.join(" ")}</p>
                  </div>
                )}
                {rows[viewingIndex].notes && (
                  <div>
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="mt-1 text-xs italic">{rows[viewingIndex].notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SocialIntegrationCard({
  platform,
  connected,
  accountName,
  selectedBusinessName,
  selectedPageName,
  onConnect,
  onDisconnect,
  onManualConnect,
}: {
  platform: SocialPlatform;
  connected: boolean;
  accountName?: string | undefined;
  selectedBusinessName?: string | undefined;
  selectedPageName?: string | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  onManualConnect?: () => void;
}) {
  const config = PLATFORM_CONFIG[platform];
  const isComingSoon = config.comingSoon === true;

  return (
    <div className={`rounded-xl border p-5 transition-all ${connected ? "border-success/30 bg-success/5" : isComingSoon ? "border-dashed bg-card opacity-75" : "border-dashed bg-card hover:border-border/80"}`}>
      <div className="flex items-start gap-4">
        <div className={`flex size-12 items-center justify-center rounded-xl ${config.color}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{platform}</h3>
            {isComingSoon ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                Coming Soon
              </span>
            ) : connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                <Check className="size-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Not Connected
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
          {connected && accountName && (
            <div className="mt-2 rounded-lg bg-success/5 px-3 py-2">
              <p className="text-xs text-muted-foreground">Connected account</p>
              <p className="text-sm font-medium text-foreground">{accountName}</p>
              {selectedBusinessName && (
                <p className="mt-1 text-xs text-muted-foreground">Business: {selectedBusinessName}</p>
              )}
              {selectedPageName && (
                <p className="mt-1 text-xs text-muted-foreground">Page: {selectedPageName}</p>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0">
          {isComingSoon ? (
            <Button size="sm" disabled className="bg-muted text-muted-foreground">
              <Link2 className="mr-1.5 size-3.5" />
              Coming Soon
            </Button>
          ) : connected ? (
            <div className="flex flex-col gap-2">
              <Button variant="destructive" size="sm" onClick={onDisconnect}>
                <Trash2 className="mr-1.5 size-3.5" />
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={onConnect} className="bg-primary hover:bg-primary/90">
                <Link2 className="mr-1.5 size-3.5" />
                Connect
              </Button>
              {onManualConnect && platform === "Facebook" && (
                <Button size="sm" variant="outline" onClick={onManualConnect}>
                  <Settings className="mr-1.5 size-3.5" />
                  Manual Token
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ clientId }: { clientId: string }) {
  const { clients } = useStore();
  const { profile } = useAuth();
  const client = clients.find((c) => c.id === clientId);
  const [socialIntegrations, setSocialIntegrations] = useState(client?.socialIntegrations || {});
  const socialIntegrationsRef = useRef(client?.socialIntegrations || {});
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const [isPaused, setIsPaused] = useState(client?.magicLinkActive === false);
  const [pageSelectorOpen, setPageSelectorOpen] = useState(false);
  const [pendingPages, setPendingPages] = useState<{ id: string; name: string; category?: string; access_token: string }[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<{ id: string; name: string; pages?: { id: string; name: string; category?: string; access_token: string }[] }[]>([]);
  const [pendingUser, setPendingUser] = useState<{ id: string; name: string } | null>(null);
  const [pendingToken, setPendingToken] = useState<{ access_token: string; expires_in: number } | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [magicToken, setMagicToken] = useState(client?.magicLinkToken || "");
  const [generating, setGenerating] = useState(false);
  const [manualTokenOpen, setManualTokenOpen] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [manualPages, setManualPages] = useState<Array<{ id: string; name: string; category: string; access_token: string }>>([]);
  const [manualSelectedPageId, setManualSelectedPageId] = useState("");
  const [manualFetching, setManualFetching] = useState(false);

  useEffect(() => {
    if (client?.socialIntegrations && Object.keys(socialIntegrationsRef.current).length === 0) {
      setSocialIntegrations(client.socialIntegrations);
      socialIntegrationsRef.current = client.socialIntegrations;
    }
  }, [client?.socialIntegrations]);

  useEffect(() => {
    async function loadToken() {
      if (!magicToken && clientId) {
        const token = await db.getOrCreateMagicLinkToken(clientId);
        setMagicToken(token);
        actions.updateClient(clientId, { magicLinkToken: token });
      }
    }
    loadToken();
  }, [clientId, magicToken]);

  const magicLinkUrl = magicToken ? `https://socmed.marketingconnective.com/client/${magicToken}` : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(magicLinkUrl);
    toast.success("Magic link copied to clipboard!");
  };

  const handleRegenerateToken = async () => {
    setGenerating(true);
    const newToken = await db.regenerateMagicLinkToken(clientId);
    if (newToken) {
      setMagicToken(newToken);
      actions.updateClient(clientId, { magicLinkToken: newToken, magicLinkActive: true });
      setIsPaused(false);
      toast.success("Magic link regenerated!");
    } else {
      toast.error("Failed to regenerate magic link");
    }
    setGenerating(false);
  };

  const handleToggleMagicLink = async () => {
    const newActive = isPaused;
    const success = await db.toggleMagicLinkActive(clientId, newActive);
    if (success) {
      setIsPaused(!newActive);
      actions.updateClient(clientId, { magicLinkActive: newActive });
      toast.success(newActive ? "Magic link activated" : "Magic link paused");
    }
  };

  if (!client) return null;

  const handleConnect = (platform: SocialPlatform) => {
    if (platform === "Facebook") {
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      const authUrl = `/api/auth/facebook?client_id=${clientId}&role=${profile?.role || 'client'}`;

      const popup = window.open(
        authUrl,
        `facebook_oauth_${clientId}`,
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      let authSuccessful = false;

      const processFacebookAuth = (eventData: Record<string, unknown>) => {
        authSuccessful = true;
        const user = eventData['user'] as { id: string; name: string };
        const businesses = (eventData['businesses'] || []) as Array<{ id: string; name: string; pages?: Array<{ id: string; name: string; category: string; access_token: string }> }>;
        const pages = (eventData['pages'] || []) as Array<{ id: string; name: string; category: string; access_token: string }>;
        const autoConnect = eventData['auto_connect'] === true;

        if (autoConnect && businesses.length === 1 && pages.length === 1) {
          const biz = businesses[0]!;
          const page = pages[0]!;

          // Use the PAGE access token (not user token)
          const pageAccessToken = page.access_token || (eventData['access_token'] as string);

          const newIntegrations = {
            ...socialIntegrationsRef.current,
            Facebook: {
              connected: true,
              accountName: user.name,
              accountId: user.id,
              connectedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              accessToken: pageAccessToken,
              tokenExpiresIn: eventData['expires_in'] as number,
              pages: [page],
              selectedBusinessId: biz.id,
              selectedBusinessName: biz.name,
              selectedPageId: page.id,
              selectedPageName: page.name,
            },
          };
          setSocialIntegrations(newIntegrations);
          socialIntegrationsRef.current = newIntegrations;
          actions.updateClient(clientId, { socialIntegrations: newIntegrations });
          forceUpdate();

          toast.success(`Facebook connected to "${page.name}" successfully!`);
        } else {
          setPendingPages(pages);
          setPendingBusinesses(businesses);
          setPendingUser(user);
          setPendingToken({
            access_token: eventData.access_token as string,
            expires_in: eventData.expires_in as number,
          });
          setSelectedBusinessId(businesses[0]?.id || "");
          setSelectedPageId(pages[0]?.id || "");
          setPageSelectorOpen(true);
        }
      };

      const handler = (event: MessageEvent) => {
        if (event.data?.type === "facebook-auth-success" && event.data.clientId === clientId) {
          processFacebookAuth(event.data);
          window.removeEventListener("message", handler);
        } else if (event.data?.type === "facebook-auth-error" && event.data.clientId === clientId) {
          toast.error(`Failed to connect ${platform}: ${event.data.error}`);
          window.removeEventListener("message", handler);
        }
      };

      window.addEventListener("message", handler);

      const handleStorage = (e: StorageEvent) => {
        if (e.key === "socmedconnective-fb-auth" && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data.type === "facebook-auth-success" && data.clientId === clientId) {
              processFacebookAuth(data);
              localStorage.removeItem("socmedconnective-fb-auth");
            }
          } catch {}
        }
      };
      window.addEventListener("storage", handleStorage);

      const checkExisting = setInterval(() => {
        try {
          const raw = localStorage.getItem("socmedconnective-fb-auth");
          if (raw) {
            const data = JSON.parse(raw);
            if (data.type === "facebook-auth-success" && data.clientId === clientId) {
              processFacebookAuth(data);
              localStorage.removeItem("socmedconnective-fb-auth");
            }
          }
        } catch {}
      }, 300);

      if (popup) {
        const check = setInterval(() => {
          if (popup.closed) {
            clearInterval(check);
            clearInterval(checkExisting);
            window.removeEventListener("message", handler);
            window.removeEventListener("storage", handleStorage);

            if (!authSuccessful) {
              const newIntegrations = {
                ...socialIntegrationsRef.current,
                Facebook: { connected: false },
              };
              setSocialIntegrations(newIntegrations);
              socialIntegrationsRef.current = newIntegrations;
              actions.updateClient(clientId, { socialIntegrations: newIntegrations });
              forceUpdate();
            }
          }
        }, 4000);
      }
    } else if (platform === "Instagram") {
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      const authUrl = `/api/auth/instagram?client_id=${clientId}`;

      const popup = window.open(
        authUrl,
        `instagram_oauth_${clientId}`,
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      let igAuthSuccessful = false;

      const processInstagramAuth = (eventData: Record<string, unknown>) => {
        igAuthSuccessful = true;
        const instagramAccounts = (eventData['instagram_accounts'] || []) as Array<{ id: string; name: string; instagram_business_account?: { id: string; name: string } }>;
        const pages = (eventData['pages'] || []) as Array<{ id: string; name: string }>;
        const user = eventData['user'] as { id: string; name: string };

        if (instagramAccounts.length === 1) {
          const account = instagramAccounts[0]!;
          const page = pages.find((p) => (p as Record<string, unknown>).instagram_business_account);
          const igAccount = page ? (page as Record<string, unknown>).instagram_business_account as { id: string; name: string } | undefined : undefined;

          const newIntegrations = {
            ...socialIntegrationsRef.current,
            Instagram: {
              connected: true,
              accountName: igAccount?.name || account.name,
              accountId: igAccount?.id || account.id,
              connectedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              accessToken: eventData['access_token'] as string,
              tokenExpiresIn: eventData['expires_in'] as number,
            },
          };
          setSocialIntegrations(newIntegrations);
          socialIntegrationsRef.current = newIntegrations;
          actions.updateClient(clientId, { socialIntegrations: newIntegrations });
          forceUpdate();

          toast.success(`Instagram connected to "${igAccount?.name || account.name}" successfully!`);
        } else if (instagramAccounts.length > 1) {
          toast.info(`Found ${instagramAccounts.length} Instagram accounts. Select one.`);
        } else {
          toast.error("No Instagram Business accounts found. Please connect an Instagram Business account to a Facebook Page first.");
        }
      };

      const handler = (event: MessageEvent) => {
        if (event.data?.type === "instagram-auth-success" && event.data.clientId === clientId) {
          processInstagramAuth(event.data);
          window.removeEventListener("message", handler);
        } else if (event.data?.type === "instagram-auth-error" && event.data.clientId === clientId) {
          toast.error(`Failed to connect Instagram: ${event.data.error}`);
          window.removeEventListener("message", handler);
        }
      };

      window.addEventListener("message", handler);

      const handleStorage = (e: StorageEvent) => {
        if (e.key === "socmedconnective-ig-auth" && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data.type === "instagram-auth-success" && data.clientId === clientId) {
              processInstagramAuth(data);
              localStorage.removeItem("socmedconnective-ig-auth");
            }
          } catch {}
        }
      };
      window.addEventListener("storage", handleStorage);

      const checkExisting = setInterval(() => {
        try {
          const raw = localStorage.getItem("socmedconnective-ig-auth");
          if (raw) {
            const data = JSON.parse(raw);
            if (data.type === "instagram-auth-success" && data.clientId === clientId) {
              processInstagramAuth(data);
              localStorage.removeItem("socmedconnective-ig-auth");
            }
          }
        } catch {}
      }, 300);

      if (popup) {
        const check = setInterval(() => {
          if (popup.closed) {
            clearInterval(check);
            clearInterval(checkExisting);
            window.removeEventListener("message", handler);
            window.removeEventListener("storage", handleStorage);

            if (!igAuthSuccessful) {
              const newIntegrations = {
                ...socialIntegrationsRef.current,
                Instagram: { connected: false },
              };
              setSocialIntegrations(newIntegrations);
              socialIntegrationsRef.current = newIntegrations;
              actions.updateClient(clientId, { socialIntegrations: newIntegrations });
              forceUpdate();
            }
          }
        }, 4000);
      }
    } else {
      toast.info(`${platform} is coming soon!`);
    }
  };

  const handleConfirmPageSelection = () => {
    if (!selectedPageId || !pendingUser || !pendingToken) return;

    const selectedPage = pendingPages.find((p) => p.id === selectedPageId);
    const selectedBusiness = pendingBusinesses.find((b) => b.id === selectedBusinessId);
    if (!selectedPage) return;

    // Use the PAGE access token (not user token) for publishing
    const pageAccessToken = selectedPage.access_token || pendingToken.access_token;

    const newIntegrations: Partial<Record<SocialPlatform, SocialConnection>> = {
      ...socialIntegrationsRef.current,
      Facebook: {
        connected: true,
        accountName: pendingUser.name,
        accountId: pendingUser.id,
        connectedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        accessToken: pageAccessToken,
        tokenExpiresIn: pendingToken.expires_in,
        pages: [selectedPage],
        selectedBusinessId: selectedBusiness?.id || "",
        selectedBusinessName: selectedBusiness?.name || "",
        selectedPageId: selectedPage.id,
        selectedPageName: selectedPage.name,
      },
    };
    setSocialIntegrations(newIntegrations);
    socialIntegrationsRef.current = newIntegrations;
    actions.updateClient(clientId, { socialIntegrations: newIntegrations });
    forceUpdate();

    toast.success(`Facebook connected to "${selectedPage.name}" successfully!`);
    setPageSelectorOpen(false);
    setPendingPages([]);
    setPendingBusinesses([]);
    setPendingUser(null);
    setPendingToken(null);
    setSelectedBusinessId("");
    setSelectedPageId("");
  };

  const handleDisconnect = (platform: SocialPlatform) => {
    const newIntegrations = {
      ...socialIntegrationsRef.current,
      [platform]: { connected: false },
    };
    setSocialIntegrations(newIntegrations);
    socialIntegrationsRef.current = newIntegrations;
    actions.updateClient(clientId, { socialIntegrations: newIntegrations });
    forceUpdate();
    toast.success(`${platform} disconnected`);
  };

  const handleManualFetchPages = async () => {
    if (!manualToken.trim()) {
      toast.error("Please enter a Page Access Token");
      return;
    }
    setManualFetching(true);
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,category,access_token&access_token=${manualToken.trim()}`
      );
      const data = await response.json();
      if (data.error) {
        toast.error(`Invalid token: ${data.error.message}`);
        setManualPages([]);
        return;
      }
      const pages = (data.data || []).filter(
        (p: { category?: string }) => !p.category?.toLowerCase().includes("instagram")
      );
      setManualPages(pages);
      if (pages.length === 0) {
        toast.error("No Facebook Pages found with this token");
      } else {
        toast.success(`Found ${pages.length} page(s)`);
        setManualSelectedPageId(pages[0]?.id || "");
      }
    } catch {
      toast.error("Failed to fetch pages. Check your token.");
      setManualPages([]);
    } finally {
      setManualFetching(false);
    }
  };

  const handleManualConnect = () => {
    if (!manualSelectedPageId || !manualToken) return;
    const selectedPage = manualPages.find((p) => p.id === manualSelectedPageId);
    if (!selectedPage) return;

    const newIntegrations: Partial<Record<SocialPlatform, SocialConnection>> = {
      ...socialIntegrationsRef.current,
      Facebook: {
        connected: true,
        accountName: selectedPage.name,
        accountId: selectedPage.id,
        connectedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        accessToken: manualToken.trim(),
        tokenExpiresIn: 0,
        pages: [{ id: selectedPage.id, name: selectedPage.name, access_token: manualToken.trim(), category: selectedPage.category }],
        selectedBusinessId: "",
        selectedBusinessName: "",
        selectedPageId: selectedPage.id,
        selectedPageName: selectedPage.name,
      },
    };
    setSocialIntegrations(newIntegrations);
    socialIntegrationsRef.current = newIntegrations;
    actions.updateClient(clientId, { socialIntegrations: newIntegrations });
    forceUpdate();

    toast.success(`Facebook connected to "${selectedPage.name}" successfully!`);
    setManualTokenOpen(false);
    setManualToken("");
    setManualPages([]);
    setManualSelectedPageId("");
  };

  const connectedCount = SOCIAL_PLATFORMS.filter(
    (p) => socialIntegrations[p]?.connected
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Client Magic Link</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Share this link with {client.name} to let them view their content without logging in.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 rounded-lg border bg-muted px-3 py-2">
            <input
              type="text"
              value={magicLinkUrl}
              readOnly
              className="w-full bg-transparent text-sm text-foreground outline-none"
            />
          </div>
          <Button size="sm" onClick={handleCopyLink} disabled={!magicLinkUrl}>
            <Link2 className="mr-1.5 size-3.5" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerateToken}
            disabled={generating}
          >
            {generating ? "Generating..." : "Regenerate"}
          </Button>
          <Button
            size="sm"
            variant={isPaused ? "default" : "outline"}
            onClick={handleToggleMagicLink}
          >
            {isPaused ? (
              <>
                <Check className="mr-1.5 size-3.5" />
                Resume
              </>
            ) : (
              <>
                <Trash2 className="mr-1.5 size-3.5" />
                Pause
              </>
            )}
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isPaused ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
            {isPaused ? "Paused" : "Active"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isPaused ? "Link is currently paused" : "Link is active and accepting views"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Social Integrations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect social media accounts for {client.name} to enable direct posting and analytics.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-semibold">{connectedCount}</span>
            <p className="text-xs text-muted-foreground">of {SOCIAL_PLATFORMS.length} connected</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((platform) => (
            <SocialIntegrationCard
              key={platform}
              platform={platform}
              connected={socialIntegrations[platform]?.connected === true}
              accountName={socialIntegrations[platform]?.accountName}
              selectedBusinessName={socialIntegrations[platform]?.selectedBusinessName}
              selectedPageName={socialIntegrations[platform]?.selectedPageName}
              onConnect={() => handleConnect(platform)}
              onDisconnect={() => handleDisconnect(platform)}
              onManualConnect={platform === "Facebook" ? () => setManualTokenOpen(true) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Page Selector Modal */}
      <Dialog open={pageSelectorOpen} onOpenChange={setPageSelectorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Facebook Business & Page</DialogTitle>
            <DialogDescription>
              Choose one Business and one Page to connect with {client.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {pendingPages.length === 0 && pendingBusinesses.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No Facebook Businesses or Pages found. Please create a Business and Page first.
                </p>
              </div>
            ) : (
              <>
                {pendingBusinesses.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Business Portfolio</Label>
                    <Select
                      value={selectedBusinessId}
                      onValueChange={(value) => {
                        setSelectedBusinessId(value);
                        setSelectedPageId("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a business..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingBusinesses.map((business) => (
                          <SelectItem key={business.id} value={business.id}>
                            {business.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedBusinessId && (
                  <div className="space-y-2">
                    <Label className="text-sm">Page</Label>
                    <Select
                      value={selectedPageId}
                      onValueChange={setSelectedPageId}
                      disabled={!selectedBusinessId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a page..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingPages
                          .filter((p) => {
                            const biz = pendingBusinesses.find((b) => b.id === selectedBusinessId);
                            return biz?.pages?.some((bp) => bp.id === p.id) ?? true;
                          })
                          .map((page) => (
                            <SelectItem key={page.id} value={page.id}>
                              {page.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Select 1 Business and 1 Page to connect.
                </p>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setPageSelectorOpen(false);
                setPendingPages([]);
                setPendingBusinesses([]);
                setPendingUser(null);
                setPendingToken(null);
                setSelectedBusinessId("");
                setSelectedPageId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPageSelection}
              disabled={!selectedBusinessId || !selectedPageId}
            >
              Connect
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Token Input Dialog */}
      <Dialog open={manualTokenOpen} onOpenChange={setManualTokenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Facebook Token</DialogTitle>
            <DialogDescription>
              Paste your Page Access Token from Facebook Graph API Explorer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How to get your token:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to <a href="https://business.facebook.com/settings/pages" target="_blank" rel="noopener noreferrer" className="text-primary underline">Facebook Business Suite</a></li>
                <li>Select your Page from the list</li>
                <li>Go to <strong>Settings</strong> → <strong>Page Access</strong> or <strong>Integrations</strong></li>
                <li>Generate or copy your <strong>Page Access Token</strong></li>
                <li>Make sure token has permissions: <code className="bg-muted px-1 rounded">pages_show_list</code>, <code className="bg-muted px-1 rounded">pages_manage_posts</code></li>
                <li>Paste the token below</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Page Access Token</Label>
              <textarea
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste your Page Access Token here..."
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono h-20 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button
              onClick={handleManualFetchPages}
              disabled={!manualToken.trim() || manualFetching}
              className="w-full"
              variant="outline"
            >
              {manualFetching ? "Fetching pages..." : "Fetch Pages"}
            </Button>

            {manualPages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Select Page</Label>
                <Select
                  value={manualSelectedPageId}
                  onValueChange={setManualSelectedPageId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a page..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manualPages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setManualTokenOpen(false);
                setManualToken("");
                setManualPages([]);
                setManualSelectedPageId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualConnect}
              disabled={!manualSelectedPageId || manualPages.length === 0}
            >
              Connect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountTab({ client }: { client: { id: string; name: string } }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold">Login Credentials</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account login for {client.name}.
        </p>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Username</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                className="pl-9"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button className="w-full sm:w-auto">Save Credentials</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold">Or Account Google Login</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with your Google account for quick access.
        </p>
        <div className="mt-4">
          <Button variant="outline" className="w-full sm:w-auto">
            <svg className="mr-2 size-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

type Tab = "content" | "ai-content" | "media" | "settings" | "account";


function MediaTab({ client }: { client: { id: string; name: string } }) {
  const { content } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "images" | "videos">("all");

  const allMedia = content
    .filter((c) => (c.clientId === clientId || c.client === client.name) && c.media && c.media.length > 0)
    .flatMap((c) =>
      (c.media || []).map((url) => ({
        id: `${c.id}-${url}`,
        url,
        title: c.title,
        type: url.match(/\.(mp4|mov|avi|webm)$/i) ? "video" : "image",
      }))
    );

  const filteredMedia = allMedia.filter((m) => {
    if (filter === "images") return m.type === "image";
    if (filter === "videos") return m.type === "video";
    return true;
  });

  const images = filteredMedia.filter((m) => m.type === "image");
  const videos = filteredMedia.filter((m) => m.type === "video");

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMedia.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMedia.map((m) => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = () => {
    toast.success(`${selectedIds.length} media deleted`);
    setSelectedIds([]);
  };

  const handleAddImages = (files: FileList | null) => {
    const fileList = Array.from(files || []);
    const validFiles = fileList.filter((f) => /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi)$/i.test(f.name));
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} files added`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Media Library</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All media files for {client.name}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleAddImages(e.target.files)}
            />
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <PlusCircle className="mr-1.5 size-3.5" />
              Add Images
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({allMedia.length})
            </button>
            <button
              onClick={() => setFilter("images")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "images"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Image className="mr-1 inline size-3" />
              Images ({images.length})
            </button>
            <button
              onClick={() => setFilter("videos")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "videos"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Film className="mr-1 inline size-3" />
              Videos ({videos.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredMedia.length && filteredMedia.length > 0}
                onChange={toggleSelectAll}
                className="size-4 rounded border-gray-300"
              />
              Select All
            </label>
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected}>
                <Trash2 className="mr-1.5 size-3.5" />
                Delete ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>

        {filteredMedia.length > 0 ? (
          <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {filteredMedia.map((media) => (
              <div
                key={media.id}
                className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                  selectedIds.includes(media.id)
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent hover:border-border"
                }`}
                onClick={() => toggleSelect(media.id)}
              >
                <div className="aspect-square bg-muted">
                  {media.type === "image" ? (
                    <img
                      src={media.url}
                      alt={media.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Film className="size-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 flex items-start justify-end p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <div
                    className={`flex size-6 items-center justify-center rounded-full ${
                      selectedIds.includes(media.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/80 text-foreground"
                    }`}
                  >
                    {selectedIds.includes(media.id) && <Check className="size-4" />}
                  </div>
                </div>
                {media.type === "video" && (
                  <div className="absolute bottom-2 left-2">
                    <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                      <Film className="size-3" /> Video
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <Image className="size-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold">No Media Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add images or videos for {client.name}.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
              <PlusCircle className="mr-1.5 size-3.5" />
              Add Media
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AIContentTab({ client }: { client: { id: string; name: string; socialIntegrations?: Record<string, { connected?: boolean }> } }) {
  const { content, clients } = useStore();
  const navigate = useNavigate();
  const campaignImageRef = useRef<HTMLInputElement>(null);
  const referenceDocRef = useRef<HTMLInputElement>(null);
  const [postsAbout, setPostsAbout] = useState("");
  const [campaignImage, setCampaignImage] = useState<string | null>(null);
  const [referenceDocument, setReferenceDocument] = useState<File | null>(null);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [knowledgeNotes, setKnowledgeNotes] = useState("");
  const [knowledgeFiles, setKnowledgeFiles] = useState<string[]>([]);
  const [postsPerPlatform, setPostsPerPlatform] = useState<Record<string, number>>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const knowledgeOptions = ["BKB", "BE", "Persona 1", "Persona 2", "Persona 3"];

  const clientData = clients.find((c) => c.id === client.id);
  const connectedPlatforms = SOCIAL_PLATFORMS.filter(
    (p) => clientData?.socialIntegrations?.[p]?.connected === true
  );

  const handleCampaignImage = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setCampaignImage(e.target?.result as string);
      toast.success("Campaign image added");
    };
    reader.readAsDataURL(file);
  };

  const handleReferenceDoc = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setReferenceDocument(file);
    toast.success("Reference document added");
  };

  const toggleKnowledgeFiles = (value: string) => {
    setKnowledgeFiles((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleGenerate = () => {
    toast.success("Generating AI content...");
  };

  const suggestedContent = content.filter(
    (c) => (c.clientId === clientId || c.client === client.name) && c.status === "Suggested"
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">AI Content Generator</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate marketing content using AI for {client.name}.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">What should the posts be about?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Describe the topic or theme for your content.
            </p>
            <textarea
              value={postsAbout}
              onChange={(e) => setPostsAbout(e.target.value)}
              placeholder="Enter the main topic or theme for your posts..."
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm min-h-[100px]"
            />
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Campaign Image (Optional)</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload an image or use GBP images for your campaign.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <input
                ref={campaignImageRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleCampaignImage(e.target.files)}
              />
              <Button variant="outline" size="sm" onClick={() => campaignImageRef.current?.click()}>
                <PlusCircle className="mr-1.5 size-3.5" />
                Add Image
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.info("GBP Images feature coming soon")}>
                <Image className="mr-1.5 size-3.5" />
                Source GBP Images
              </Button>
            </div>
            {campaignImage && (
              <div className="mt-3 relative inline-block">
                <img src={campaignImage} alt="Campaign" className="h-24 rounded-lg border object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 size-6"
                  onClick={() => setCampaignImage(null)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Reference Document (Optional)</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a reference document for content generation.
              </p>
              <div className="mt-3">
                <input
                  ref={referenceDocRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => handleReferenceDoc(e.target.files)}
                />
                <Button variant="outline" size="sm" onClick={() => referenceDocRef.current?.click()}>
                  <FileSpreadsheet className="mr-1.5 size-3.5" />
                  Choose File
                </Button>
                {referenceDocument && (
                  <p className="mt-2 text-xs text-muted-foreground">{referenceDocument.name}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Reference URL (Optional)</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a reference URL for content generation.
              </p>
              <input
                type="url"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Include Knowledge Notes</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Add knowledge notes to include in content generation.
            </p>
            <textarea
              value={knowledgeNotes}
              onChange={(e) => setKnowledgeNotes(e.target.value)}
              placeholder="Enter knowledge notes here..."
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm min-h-[100px]"
            />
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Include Knowledge Files</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Select knowledge files to include in content generation.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {knowledgeOptions.map((option) => (
                <label
                  key={`files-${option}`}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-accent/40"
                >
                  <input
                    type="checkbox"
                    checked={knowledgeFiles.includes(option)}
                    onChange={() => toggleKnowledgeFiles(option)}
                    className="size-4 rounded border-gray-300"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">How Many Posts Per Platform?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Set the number of posts for each connected platform.
            </p>
            <div className="mt-3 space-y-2">
              {connectedPlatforms.length > 0 ? (
                connectedPlatforms.map((platform) => (
                  <div key={platform} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`flex size-8 items-center justify-center rounded-lg ${PLATFORM_CONFIG[platform]?.color || "bg-muted"}`}>
                        {PLATFORM_CONFIG[platform]?.icon}
                      </div>
                      <span className="text-sm font-medium">{platform}</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={postsPerPlatform[platform] || 5}
                      onChange={(e) => setPostsPerPlatform({ ...postsPerPlatform, [platform]: parseInt(e.target.value) || 5 })}
                      className="w-20 rounded-lg border px-2 py-1 text-center text-sm"
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No connected platforms. Please connect at least one platform in Settings.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Schedule</h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleGenerate} className="w-full">
            <Sparkles className="mr-2 size-4" />
            Generate AI Content
          </Button>
        </div>
      </div>

      {suggestedContent.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Suggested Posts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Content suggestions ready for review.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {suggestedContent.map((item) => (
              <div
                key={item.id}
                className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/30"
                onClick={() => navigate({ to: "/content" })}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">{item.title}</h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.caption}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <PlatformBadge platform={item.platform} />
                      <ContentTypeBadge type={item.type} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const { clients, content } = useStore();
  const client = clients.find((c) => c.id === clientId);
  const [tab, setTab] = useState<Tab>("content");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  const clientContent = content.filter((c) => c.clientId === clientId || c.client === client?.name);

  // Auto-update scheduled content status based on date
  const now = new Date();
  clientContent.forEach((item) => {
    if (item.scheduledDate && item.scheduledTime) {
      const scheduledDateTime = new Date(`${item.scheduledDate}T${item.scheduledTime}`);
      if (item.status === "Suggested" && scheduledDateTime <= now) {
        actions.update(item.id, { status: "Additional" });
      } else if (item.status === "Additional" && scheduledDateTime > now) {
        actions.update(item.id, { status: "Suggested" });
      }
    }
  });

  if (!client) {
    return (
      <>
        <PageHeader title="Client Not Found" subtitle="This client doesn't exist." />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            The client you're looking for doesn't exist or has been deleted.
          </p>
          <Button asChild className="mt-4">
            <Link to="/clients">Back to Clients</Link>
          </Button>
        </div>
      </>
    );
  }

  const c = counts(clientContent);

  return (
    <>
      <div className="mb-6">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Clients
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <ClientStatusBadge active={client.active} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {client.platforms.length > 0 ? (
              client.platforms.map((p) => <PlatformBadge key={p} platform={p} />)
            ) : (
              <span className="text-sm text-muted-foreground">No platforms assigned</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/content/create" search={{ clientId: client.id, clientName: client.name }}>Create Content</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border bg-muted p-1 w-fit">
        <button
          onClick={() => setTab("content")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "content"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="size-4" />
          Content
        </button>
        <button
          onClick={() => setTab("ai-content")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "ai-content"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="size-4" />
          AI Content
        </button>
        <button
          onClick={() => setTab("media")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "media"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Image className="size-4" />
          Media
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "settings"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="size-4" />
          Settings
        </button>
        <button
          onClick={() => setTab("account")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "account"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="size-4" />
          Account
        </button>
      </div>

      {tab === "content" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {statusCards.map((card) => (
              <button
                key={card.key}
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === card.key ? null : card.key)}
                className={`rounded-xl border bg-card p-4 shadow-soft text-left transition-all ${
                  selectedStatusFilter === card.key ? "ring-2 ring-primary/50" : "hover:shadow-md"
                }`}
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
                      width: `${clientContent.length ? Math.max(6, (c[card.key] / clientContent.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-10">
            <ImportSection clientName={client.name} clientId={clientId} />
          </div>

          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {selectedStatusFilter ? `${selectedStatusFilter} Posts` : "All Content"}
              </h2>
              {selectedStatusFilter && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedStatusFilter(null)}>
                  Show All
                </Button>
              )}
            </div>
            <ContentList
              clientFilter={client.name}
              clientIdFilter={clientId}
              status={selectedStatusFilter as any}
              showClientFilter={false}
              showStatusFilter={!selectedStatusFilter}
              dateLabel="Scheduled"
              emptyMessage={`No content for ${client.name} yet.`}
            />
          </section>
        </>
      )}

      {tab === "settings" && <SettingsTab clientId={client.id} />}

      {tab === "account" && <AccountTab client={client} />}

      {tab === "ai-content" && <AIContentTab client={client} />}

      {tab === "media" && <MediaTab client={client} />}
    </>
  );
}
