import { createFileRoute, Link } from "@tanstack/react-router";
import { Component, useEffect, useState, useMemo, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Loader2,
  LayoutGrid,
  Sparkles,
  CalendarClock,
  Send,
  CheckCircle2,
  Trash2,
  Lightbulb,
  PlusCircle,
  UploadCloud,
  FileSpreadsheet,
  Image,
} from "lucide-react";
import { ContentDetailOverlay } from "@/components/content-detail-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlatformBadge, ContentTypeBadge, StatusBadge } from "@/components/badges";
import {
  useStore,
  formatDate,
  actions,
  parseImportFile,
  SOCIAL_PLATFORMS,
  type ContentItem,
  type SocialPlatform,
} from "@/lib/content-store";
import * as db from "@/lib/db";
import { useGenerationStore, startGeneration, cancelGeneration } from "@/lib/ai-generation-store";
import type { KnowledgeFile } from "@/lib/database.types";

type ClientInfo = {
  id: string;
  name: string;
  active: boolean;
};

type Tab = "content" | "ai-content";

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

// ─── Import Section ───────────────────────────────────────────────────────────

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

// ─── AI Content Generator ─────────────────────────────────────────────────────

function AIContentTab({ client }: { client: { id: string; name: string; socialIntegrations?: Record<string, { connected?: boolean }> } }) {
  const { content, clients } = useStore();
  const gen = useGenerationStore();
  const campaignImageRef = useRef<HTMLInputElement>(null);
  const referenceDocRef = useRef<HTMLInputElement>(null);
  const [postsAbout, setPostsAbout] = useState("");
  const [campaignImage, setCampaignImage] = useState<string | null>(null);
  const [referenceDocument, setReferenceDocument] = useState<File | null>(null);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [knowledgeNotes, setKnowledgeNotes] = useState("");
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [selectedKnowledge, setSelectedKnowledge] = useState<Set<string>>(new Set());
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [postsPerPlatform, setPostsPerPlatform] = useState<Record<string, number>>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("professional");

  const isGenerating = gen.status === "running";
  const isCompleted = gen.status === "completed";
  const isCancelled = gen.status === "cancelled";
  const hasActiveJob = isGenerating || isCompleted || isCancelled;
  const completedCount = gen.posts.filter((p) => p.status === "completed").length;
  const generatingCount = gen.posts.filter((p) => p.status === "generating").length;
  const failedCount = gen.posts.filter((p) => p.status === "failed").length;
  const realPercent = gen.total > 0
    ? Math.round(((completedCount + generatingCount * 0.5) / gen.total) * 100)
    : 0;
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [estimatedPercent, setEstimatedPercent] = useState(0);
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (isGenerating && startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }
    if (!isGenerating) {
      setAnimatedPercent(realPercent);
      setEstimatedPercent(realPercent);
      if (!hasActiveJob) startTimeRef.current = 0;
      return;
    }
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const timeEstimate = Math.min(90, (elapsed / (gen.total * 20)) * 100);
      const target = Math.max(realPercent, timeEstimate);
      setEstimatedPercent(target);
    }, 5000);
    return () => clearInterval(interval);
  }, [isGenerating, realPercent, gen.total, hasActiveJob]);

  useEffect(() => {
    if (!isGenerating) return;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      setAnimatedPercent((prev) => {
        const target = Math.max(realPercent, estimatedPercent);
        if (prev >= target) return prev;
        const maxStep = Math.max(0.5, (target - prev) * 0.05);
        const step = Math.min(maxStep, target - prev);
        return Math.min(prev + step, target);
      });
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isGenerating, realPercent, estimatedPercent]);

  useEffect(() => {
    loadKnowledgeFiles();
  }, [client.id]);

  useEffect(() => {
    if (gen.status === "running" && gen.clientId === client.id) return;
    if ((isCompleted || isCancelled) && gen.clientId === client.id) {
      if (completedCount > 0) {
        toast.success(
          isCancelled
            ? `Generation cancelled. ${completedCount} posts were saved.`
            : `${completedCount} posts generated successfully!`
        );
      }
    }
  }, [gen.status]);

  useEffect(() => {
    if (gen.status === "running" && gen.clientId === client.id) {
      loadKnowledgeFiles();
    }
  }, [gen.status]);

  const loadKnowledgeFiles = async () => {
    setKnowledgeLoading(true);
    const files = await db.getKnowledgeFiles(client.id);
    setKnowledgeFiles(files);
    setKnowledgeLoading(false);
  };

  const addKnowledgeFile = async () => {
    const newFile = await db.createKnowledgeFile(client.id, "New Knowledge", "");
    if (newFile) {
      setKnowledgeFiles((prev) => [...prev, newFile]);
      toast.success("Knowledge file added");
    }
  };

  const saveKnowledgeFile = async (file: KnowledgeFile) => {
    const updated = await db.updateKnowledgeFile(file.id, file.name, file.content);
    if (updated) {
      setKnowledgeFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
      toast.success("Knowledge file saved");
    }
  };

  const deleteKnowledgeFile = async (id: string) => {
    const ok = await db.deleteKnowledgeFile(id);
    if (ok) {
      setKnowledgeFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success("Knowledge file deleted");
    }
  };

  const updateKnowledgeFileLocal = (id: string, field: "name" | "content", value: string) => {
    setKnowledgeFiles((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const toggleKnowledgeSelection = (id: string) => {
    setSelectedKnowledge((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllKnowledge = () => {
    if (selectedKnowledge.size === knowledgeFiles.length) {
      setSelectedKnowledge(new Set());
    } else {
      setSelectedKnowledge(new Set(knowledgeFiles.map((f) => f.id)));
    }
  };

  const clientData = clients.find((c) => c.id === client.id);
  const connectedPlatforms = SOCIAL_PLATFORMS.filter(
    (p) => clientData?.socialIntegrations?.[p]?.connected === true
  );

  const hasPostsPerPlatform = connectedPlatforms.some((p) => (postsPerPlatform[p] || 0) > 0);
  const hasSchedule = startDate !== "" && endDate !== "";
  const hasTopic = postsAbout.trim().length > 0;
  const isGenerateDisabled = !hasTopic || !hasPostsPerPlatform || !hasSchedule || !tone;

  const handleCampaignImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum 10MB.");
      return;
    }
    try {
      const url = await db.uploadContentMedia(file, client.id);
      if (url) {
        setCampaignImage(url);
        toast.success("Campaign image uploaded");
      } else {
        toast.error("Failed to upload image.");
      }
    } catch {
      toast.error("Failed to upload image.");
    }
  };

  const handleReferenceDoc = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setReferenceDocument(file);
    toast.success("Reference document added");
  };

  const handleGenerate = () => {
    if (!postsAbout.trim()) {
      toast.error("Enter a topic first.");
      return;
    }
    if (connectedPlatforms.length === 0) {
      toast.error("No connected platforms. Please connect a platform first.");
      return;
    }

    const varietyAspects = [
      "Create an engaging introduction/hook post",
      "Focus on the key features and benefits",
      "Share a behind-the-scenes or story angle",
      "Use social proof or testimonial style",
      "Create urgency with a strong call-to-action",
      "Educate the audience with tips or insights",
      "Highlight a specific product or service detail",
      "Create an emotional connection with the audience",
    ];

    const selected = knowledgeFiles.filter((f) => selectedKnowledge.has(f.id));

    setAnimatedPercent(0);
    setEstimatedPercent(0);
    startTimeRef.current = Date.now();

    startGeneration({
      topic: postsAbout.trim(),
      body: knowledgeNotes.trim(),
      clientName: client.name,
      clientId: client.id,
      tone,
      goal: goal || "",
      knowledgeFiles: selected.map((f) => ({ name: f.name, content: f.content })),
      campaignImage: campaignImage || "",
      referenceUrl: referenceUrl.trim(),
      startDate,
      endDate,
      postsPerPlatform: Object.fromEntries(
        connectedPlatforms.map((p) => [p, postsPerPlatform[p] || 0])
      ),
      connectedPlatforms,
      varietyAspects,
    });

    toast.success("Generation started!", { description: "Processing posts in the background." });
  };

  const handleCancel = () => {
    cancelGeneration();
    toast.info("Generation cancelled.");
  };

  const suggestedContent = content.filter(
    (c) => (c.clientId === client.id || c.client === client.name) && c.status === "Suggested"
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
          {!hasActiveJob && (
            <>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Goal</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Select the goal for your content.
                  </p>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Education", "Promotion", "Engagement", "Awareness", "Announcement"].map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Tone</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Select the tone for your content.
                  </p>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Professional", "Friendly", "Educational", "Promotional", "Casual"].map((t) => (
                        <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Include Knowledge Files</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select knowledge files to include in content generation.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {knowledgeFiles.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSelectAllKnowledge}
                        className="text-xs"
                      >
                        {selectedKnowledge.size === knowledgeFiles.length ? "Deselect All" : "Select All"}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={addKnowledgeFile}>
                      <PlusCircle className="mr-1.5 size-3.5" />
                      Add New
                    </Button>
                  </div>
                </div>
                {knowledgeLoading ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading knowledge files...
                  </div>
                ) : knowledgeFiles.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No knowledge files yet. Click "Add New" to create one.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {knowledgeFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`rounded-lg border p-3 transition-colors ${
                          selectedKnowledge.has(file.id) ? "bg-primary/5 border-primary/30" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedKnowledge.has(file.id)}
                            onChange={() => toggleKnowledgeSelection(file.id)}
                            className="size-4 rounded border-gray-300"
                          />
                          <input
                            type="text"
                            value={file.name}
                            onChange={(e) => updateKnowledgeFileLocal(file.id, "name", e.target.value)}
                            className="flex-1 rounded border px-2 py-1 text-sm font-medium bg-transparent"
                            placeholder="Knowledge file name..."
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => deleteKnowledgeFile(file.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <textarea
                          value={file.content}
                          onChange={(e) => updateKnowledgeFileLocal(file.id, "content", e.target.value)}
                          placeholder="Enter knowledge content here..."
                          className="mt-2 w-full rounded border px-2 py-1 text-sm min-h-[60px] bg-transparent"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => saveKnowledgeFile(file)}
                          className="mt-2"
                        >
                          Save
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedKnowledge.size > 0 && (
                  <p className="mt-2 text-xs text-primary">
                    {selectedKnowledge.size} of {knowledgeFiles.length} knowledge files selected for content generation
                  </p>
                )}
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
                          min="0"
                          max="30"
                          value={postsPerPlatform[platform] || 0}
                          onChange={(e) => setPostsPerPlatform({ ...postsPerPlatform, [platform]: parseInt(e.target.value) || 0 })}
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
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (endDate && e.target.value > endDate) setEndDate("");
                      }}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || new Date().toISOString().slice(0, 10)}
                      max={startDate ? new Date(new Date(startDate).getTime() + 60 * 86400000).toISOString().slice(0, 10) : undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      disabled={!startDate}
                    />
                    {!startDate && (
                      <p className="mt-1 text-[10px] text-muted-foreground">Select start date first</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {hasActiveJob && (
            <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
              <div className="border-b bg-muted/30 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isGenerating && (
                      <div className="size-2 rounded-full bg-primary animate-pulse" />
                    )}
                    {isCompleted && (
                      <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      </div>
                    )}
                    {isCancelled && (
                      <div className="flex size-6 items-center justify-center rounded-full bg-amber-100">
                        <Trash2 className="size-4 text-amber-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold">
                        {isGenerating && "Generating AI Content"}
                        {isCompleted && "Generation Complete"}
                        {isCancelled && "Generation Cancelled"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {gen.topic} — {gen.clientName}
                      </p>
                    </div>
                  </div>
                  {isGenerating && (
                    <Button variant="destructive" size="sm" onClick={handleCancel}>
                      Cancel Generation
                    </Button>
                  )}
                  {!isGenerating && (
                    <Button variant="outline" size="sm" onClick={() => { window.location.reload(); }}>
                      Done
                    </Button>
                  )}
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">
                    {completedCount} of {gen.total} posts completed
                  </span>
                  <span className="font-semibold text-primary">{Math.min(100, Math.round(animatedPercent))}%</span>
                </div>
                <Progress value={Math.min(100, animatedPercent)} className="h-2.5" />
                {failedCount > 0 && (
                  <p className="mt-1.5 text-xs text-destructive">
                    {failedCount} post{failedCount > 1 ? "s" : ""} failed
                  </p>
                )}
              </div>

              <div className="border-t divide-y">
                {gen.posts.map((post, idx) => (
                  <div key={post.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                      {post.status === "completed" && (
                        <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="size-4" />
                        </div>
                      )}
                      {post.status === "generating" && (
                        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
                          <svg className="size-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      )}
                      {post.status === "failed" && (
                        <div className="flex size-7 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                          <span className="text-xs font-bold">!</span>
                        </div>
                      )}
                      {post.status === "cancelled" && (
                        <div className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <span className="text-xs">—</span>
                        </div>
                      )}
                      {post.status === "pending" && (
                        <div className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{post.platform}</span>
                        {post.status === "completed" && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Done</span>
                        )}
                        {post.status === "generating" && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Generating...</span>
                        )}
                        {post.status === "failed" && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Failed</span>
                        )}
                        {post.status === "cancelled" && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Cancelled</span>
                        )}
                        {post.status === "pending" && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Waiting</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {post.variety}
                      </p>
                      {post.error && (
                        <p className="text-[10px] text-destructive mt-0.5">{post.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasActiveJob && (
            <Button onClick={handleGenerate} className="w-full" size="lg" disabled={isGenerateDisabled}>
              <Sparkles className="mr-2 size-4" />
              Generate AI Content
            </Button>
          )}
        </div>
      </div>

      {suggestedContent.length > 0 && (
        <SuggestedPostsSection
          content={suggestedContent}
          clientName={client.name}
        />
      )}
    </div>
  );
}

// ─── Suggested Posts Section ──────────────────────────────────────────────────

function SuggestedPostsSection({ content, clientName }: { content: ContentItem[]; clientName: string }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewItem, setViewItem] = useState<ContentItem | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const months = Array.from(new Set(
    content
      .map((c) => c.scheduledDate || c.date)
      .filter(Boolean)
      .map((d) => d.slice(0, 7))
  )).sort().reverse();

  const filtered = monthFilter === "all"
    ? content
    : content.filter((c) => (c.scheduledDate || c.date || "").startsWith(monthFilter));

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [monthFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paged.map((c) => c.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await actions.purge(id);
    }
    toast.success(`${selectedIds.size} posts deleted`);
    setSelectedIds(new Set());
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Suggested Posts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} content suggestion{filtered.length !== 1 ? "s" : ""} ready for review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="mr-1.5 size-3.5" />
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {months.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setMonthFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              monthFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {months.map((m) => {
            const label = new Date(m + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" });
            return (
              <button
                key={m}
                onClick={() => setMonthFilter(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  monthFilter === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <input
          type="checkbox"
          checked={selectedIds.size === paged.length && paged.length > 0}
          onChange={toggleSelectAll}
          className="size-4 rounded border-gray-300"
        />
        <span className="text-xs text-muted-foreground">
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all on this page"}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {paged.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="mt-1 size-4 shrink-0 rounded border-gray-300"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium leading-snug">{item.title}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.caption}
                </p>
                {item.hashtags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.hashtags.slice(0, 6).map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        #{tag}
                      </span>
                    ))}
                    {item.hashtags.length > 6 && (
                      <span className="text-[10px] text-muted-foreground">+{item.hashtags.length - 6}</span>
                    )}
                  </div>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <PlatformBadge platform={item.platform} />
                  <ContentTypeBadge type={item.type} />
                  {item.scheduledDate && (
                    <span className="flex items-center gap-1 text-[10px]">
                      <CalendarClock className="size-3" />
                      {item.scheduledDate} {item.scheduledTime || ""}
                    </span>
                  )}
                </div>
                {item.media?.[0] && (
                  <img src={item.media[0]} alt="" className="mt-2 h-16 w-16 rounded-lg object-cover" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setViewItem(item)}
              >
                View
              </Button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewItem.title}</DialogTitle>
              <DialogDescription>
                <span className="flex items-center gap-2 mt-1">
                  <PlatformBadge platform={viewItem.platform} />
                  <ContentTypeBadge type={viewItem.type} />
                  <StatusBadge status={viewItem.status} />
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {viewItem.media?.[0] && (
                <img src={viewItem.media[0]} alt="" className="w-full max-h-64 rounded-lg object-cover" />
              )}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1">Caption</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{viewItem.caption}</p>
              </div>
              {viewItem.hashtags?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Hashtags</h4>
                  <div className="flex flex-wrap gap-1">
                    {viewItem.hashtags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {viewItem.cta && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Call to Action</h4>
                  <p className="text-sm">{viewItem.cta}</p>
                </div>
              )}
              {viewItem.notes && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Notes</h4>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{viewItem.notes}</p>
                </div>
              )}
              {viewItem.scheduledDate && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  Scheduled: {viewItem.scheduledDate} {viewItem.scheduledTime || ""}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Error Boundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  error: Error | null;
}

class ClientPortalErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ClientPortal Error]", error, errorInfo);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-muted-foreground">
              An error occurred while loading the content. Please try refreshing the page.
            </p>
            <pre className="mt-4 max-h-40 overflow-auto rounded bg-muted p-3 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Refresh Page
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/client/$token")({
  head: () => ({
    meta: [
      { title: "Client Portal — Social Media Connective" },
      {
        name: "description",
        content: "View and manage your marketing content.",
      },
    ],
  }),
  component: () => (
    <ClientPortalErrorBoundary>
      <ClientPortal />
    </ClientPortalErrorBoundary>
  ),
});

// ─── Client Portal Component ─────────────────────────────────────────────────

function ClientPortal() {
  const { token } = Route.useParams();
  const { content, clients } = useStore();
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [tab, setTab] = useState<Tab>("content");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>("Suggested");
  const [monthFilter, setMonthFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get client info from the store (loaded by StoreLoader)
  const clientInfo = useMemo<ClientInfo | null>(() => {
    if (!token || clients.length === 0) return null;
    // Find client whose magicLinkToken matches
    const match = clients.find(
      (c) => c.magicLinkActive && c.magicLinkToken === token
    );
    if (match) return { id: match.id, name: match.name, active: match.active };
    return null;
  }, [clients, token]);

  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // If store is loaded but client not found, show error
    if (clients.length > 0 && !clientInfo) {
      setNotFound(true);
    }
  }, [clients, clientInfo]);

  // Loading state: store not yet loaded
  if (clients.length === 0 && !notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state: client not found
  if (notFound || !clientInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Link Unavailable</h1>
          <p className="mt-2 text-muted-foreground">
            Invalid or expired link. Please contact your administrator.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const clientContent = content.filter(
    (c) => c.clientId === clientInfo.id || c.client === clientInfo.name
  );

  const months = Array.from(
    new Set(
      clientContent
        .map((c) => c.scheduledDate || c.date)
        .filter(Boolean)
        .map((d) => d.slice(0, 7))
    )
  )
    .sort()
    .reverse();

  const filteredByMonth =
    monthFilter === "all"
      ? clientContent
      : clientContent.filter((c) =>
          (c.scheduledDate || c.date || "").startsWith(monthFilter)
        );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Suggested: 0,
      Additional: 0,
      Submitted: 0,
      Approved: 0,
      Deleted: 0,
    };
    filteredByMonth.forEach((c) => {
      if (c.status in counts)
        counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [filteredByMonth]);

  const displayedContent = useMemo(() => {
    if (!selectedStatusFilter) return filteredByMonth;
    return filteredByMonth.filter((c) => c.status === selectedStatusFilter);
  }, [filteredByMonth, selectedStatusFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const items = displayedContent;
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((c) => c.id)));
    }
  };

  const purgeSelected = async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await actions.setStatus(id, "Deleted");
    }
    toast.success(`${selectedIds.size} posts moved to Deleted`);
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">{clientInfo.name}</h1>
            <p className="text-sm text-muted-foreground">Content Dashboard</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
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
        </div>

        {tab === "content" && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {statusCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() =>
                    setSelectedStatusFilter(
                      selectedStatusFilter === card.key ? null : card.key
                    )
                  }
                  className={`rounded-xl border bg-card p-4 shadow-soft text-left transition-all ${
                    selectedStatusFilter === card.key
                      ? "ring-2 ring-primary/50"
                      : "hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl font-semibold tabular-nums">
                      {statusCounts[card.key]}
                    </span>
                    <card.icon
                      className="size-4 text-muted-foreground"
                      strokeWidth={1.75}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {card.label}
                  </p>
                  <div className="mt-3 h-1 rounded-full bg-muted">
                    <div
                      className="h-1 rounded-full bg-primary/70"
                      style={{
                        width: `${
                          clientContent.length
                            ? Math.max(
                                6,
                                ((statusCounts[card.key] || 0) /
                                  clientContent.length) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-10">
              <ImportSection clientName={clientInfo.name} clientId={clientInfo.id} />
            </div>

            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  {selectedStatusFilter
                    ? `${selectedStatusFilter} Posts`
                    : "All Content"}
                </h2>
                {selectedStatusFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedStatusFilter(null)}
                  >
                    Show All
                  </Button>
                )}
              </div>

              {months.length > 0 && (
                <div className="mb-4 flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Filter by month:
                  </Label>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Months ({clientContent.length})
                      </SelectItem>
                      {months.map((m) => {
                        const label = new Date(m + "-01").toLocaleDateString(
                          "en-US",
                          { month: "short", year: "numeric" }
                        );
                        const count = clientContent.filter((c) =>
                          (c.scheduledDate || c.date || "").startsWith(m)
                        ).length;
                        return (
                          <SelectItem key={m} value={m}>
                            {label} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedStatusFilter === "Suggested" && displayedContent.length > 0 && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border bg-accent/50 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === displayedContent.length && displayedContent.length > 0}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-gray-300"
                  />
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                  </span>
                  {selectedIds.size > 0 && (
                    <Button variant="destructive" size="sm" className="ml-auto" onClick={purgeSelected}>
                      <Trash2 className="mr-1.5 size-3.5" />
                      Delete ({selectedIds.size})
                    </Button>
                  )}
                </div>
              )}

              {displayedContent.length > 0 ? (
                <div className="hidden overflow-hidden rounded-xl border bg-card shadow-soft md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        {selectedStatusFilter === "Suggested" && (
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-muted-foreground/25"
                              checked={selectedIds.size === displayedContent.length && displayedContent.length > 0}
                              onChange={toggleSelectAll}
                            />
                          </TableHead>
                        )}
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Scheduled Post</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedContent.map((item) => {
                        const img = item.media?.[0] as string | undefined;
                        return (
                          <TableRow key={item.id}>
                            {selectedStatusFilter === "Suggested" && (
                              <TableCell>
                                <input
                                  type="checkbox"
                                  className="size-4 rounded border-muted-foreground/25"
                                  checked={selectedIds.has(item.id)}
                                  onChange={() => toggleSelect(item.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              {img ? (
                                <img
                                  src={img}
                                  alt=""
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                                  {item.type === "Image"
                                    ? "IMG"
                                    : item.type === "Short Video"
                                      ? "VID"
                                      : item.type === "Carousel"
                                        ? "CAR"
                                        : "TXT"}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[280px] font-medium">
                              {item.title}
                            </TableCell>
                            <TableCell>
                              <PlatformBadge platform={item.platform} />
                            </TableCell>
                            <TableCell>
                              <ContentTypeBadge type={item.type} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={item.status} />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {item.scheduledDate
                                ? `${item.scheduledDate}${item.scheduledTime ? ` ${item.scheduledTime}` : ""}`
                                : formatDate(item.date)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelected(item)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
                  <p className="text-sm font-medium">
                    No content for {clientInfo.name} yet.
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "ai-content" && (
          <AIContentTab client={{ id: clientInfo.id, name: clientInfo.name }} />
        )}
      </main>

      {selected && (
        <ContentDetailOverlay
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
