import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Link,
  Upload,
  FileText,
  Pencil,
  Trash2,
  Save,
  X,
  ChevronDown,
  Globe,
  Loader2,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api, type KnowledgeItem } from "@/lib/api";

type Tab = "manual" | "url" | "file";

export function KnowledgeManager() {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("manual");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Manual entry
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  // URL import
  const [url, setUrl] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);
  const [urlGenerateAi, setUrlGenerateAi] = useState(false);
  const [urlCrawl, setUrlCrawl] = useState(false);
  const [urlMaxPages, setUrlMaxPages] = useState(20);
  const [urlMaxDepth, setUrlMaxDepth] = useState(3);

  // Crawl progress
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [crawlStatusText, setCrawlStatusText] = useState("");

  // File upload
  const [dragging, setDragging] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [fileGenerateAi, setFileGenerateAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Edit
  const [editing, setEditing] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // View overlay
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewTitle, setViewTitle] = useState("");
  const [viewContent, setViewContent] = useState("");
  const [viewCategory, setViewCategory] = useState("");
  const [viewDirty, setViewDirty] = useState(false);
  const [viewSaving, setViewSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await api.getKnowledge();
      setItems(data);
    } catch (e) {
      console.error("Failed to fetch knowledge:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const categories = Array.from(new Set(items.map((i) => i.category)));

  const filtered = items.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      if (!i.question.toLowerCase().includes(q) && !i.answer.toLowerCase().includes(q)) return false;
    }
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  });

  // Manual add
  const handleManualAdd = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title dan content wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await api.createKnowledge({ question: title, answer: content, category });
      toast.success("Data berhasil ditambahkan");
      setTitle("");
      setContent("");
      setCategory("general");
      fetchItems();
    } catch {
      toast.error("Gagal menambahkan data");
    } finally {
      setSubmitting(false);
    }
  };

  // URL import
  const handleUrlImport = async () => {
    if (!url.trim()) {
      toast.error("Masukkan URL yang valid");
      return;
    }

    if (urlCrawl) {
      setImportingUrl(true);
      const startUrl = url;
      try {
        const { jobId } = await api.startCrawl(url, urlGenerateAi, urlMaxPages, urlMaxDepth);
        // Poll for progress
        let done = false;
        while (!done) {
          await new Promise((r) => setTimeout(r, 1000));
          const progress = await api.getCrawlProgress(jobId);
          setCrawlProgress(progress.progress);
          setCrawlStatusText(progress.currentUrl);
          if (progress.status === "done") {
            done = true;
            setUrl("");
            const r = progress.result!;
            const parts = [`${r.saved} dari ${r.count} entry berhasil diimport`];
            if (r.pages_crawled) parts.push(`${r.pages_crawled} halaman di-crawl`);
            toast.success(parts.join(" — "));
            fetchItems();
          } else if (progress.status === "error") {
            done = true;
            toast.error("Import URL gagal", { description: progress.error || "Unknown error" });
          }
        }
      } catch (err: any) {
        toast.error("Gagal memulai crawl", { description: err.message });
      } finally {
        setImportingUrl(false);
        setCrawlProgress(0);
        setCrawlStatusText("");
      }
      return;
    }

    setImportingUrl(true);
    try {
      const result = await api.importUrl(url, urlGenerateAi);
      if (result.saved > 0) {
        toast.success(`${result.saved} dari ${result.count} entry berhasil diimport`);
      } else {
        toast.error("Import URL gagal", { description: "Tidak ada konten yang bisa diekstrak" });
      }
      setUrl("");
      fetchItems();
    } catch (err: any) {
      toast.error("Import URL gagal", { description: err.message });
    } finally {
      setImportingUrl(false);
    }
  };

  // File upload
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    if (e.target) e.target.value = "";
  };

  const processFiles = async (files: File[]) => {
    const validExts = ["md", "txt", "json", "pdf"];
    const invalid = files.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return !validExts.includes(ext || "");
    });
    if (invalid.length > 0) {
      toast.error(`Format tidak didukung: ${invalid.map((f) => f.name).join(", ")}`);
      return;
    }

    setImportingFile(true);
    try {
      const result = await api.importFile(files, fileGenerateAi);
      if (result.saved > 0) {
        let msg = `${result.saved} dari ${result.count} entry berhasil diimport`;
        if (result.warnings && result.warnings.length > 0) {
          msg += `\nPeringatan: ${result.warnings.join("; ")}`;
        }
        toast.success(msg);
      } else {
        toast.error("Import file gagal", { description: "Tidak ada konten yang bisa diekstrak" });
      }
      fetchItems();
    } catch (err: any) {
      toast.error("Import file gagal", { description: err.message });
    } finally {
      setImportingFile(false);
    }
  };

  // Edit
  const startEdit = (item: KnowledgeItem) => {
    setEditing(item.id);
    setEditTitle(item.question);
    setEditContent(item.answer);
    setEditCategory(item.category);
  };

  const handleEdit = async (id: number) => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error("Title dan content wajib diisi");
      return;
    }
    try {
      await api.updateKnowledge(id, { question: editTitle, answer: editContent, category: editCategory });
      toast.success("Data berhasil diperbarui");
      setEditing(null);
      fetchItems();
    } catch {
      toast.error("Gagal memperbarui data");
    }
  };

  // Full overlay view/edit
  const openView = (item: KnowledgeItem) => {
    setViewingId(item.id);
    setViewTitle(item.question);
    setViewContent(item.answer);
    setViewCategory(item.category);
    setViewDirty(false);
    setViewSaving(false);
  };

  const closeView = () => {
    if (viewDirty) {
      if (!confirm("Ada perubahan yang belum disimpan. Tutup?")) return;
    }
    setViewingId(null);
  };

  const handleViewSave = async () => {
    if (viewingId === null) return;
    if (!viewTitle.trim() || !viewContent.trim()) {
      toast.error("Title dan content wajib diisi");
      return;
    }
    setViewSaving(true);
    try {
      await api.updateKnowledge(viewingId, { question: viewTitle, answer: viewContent, category: viewCategory });
      toast.success("Data berhasil diperbarui");
      setViewDirty(false);
      setViewingId(null);
      fetchItems();
    } catch {
      toast.error("Gagal memperbarui data");
    } finally {
      setViewSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    const prevItems = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.deleteKnowledge(id);
      toast.success("Data berhasil dihapus");
    } catch {
      setItems(prevItems);
      toast.error("Gagal menghapus data");
    } finally {
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleToggleActive = async (item: KnowledgeItem) => {
    try {
      await api.updateKnowledge(item.id, { is_active: !item.is_active } as any);
      toast.success(item.is_active ? "Data dinonaktifkan" : "Data diaktifkan");
      fetchItems();
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const handleBulkToggle = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    const allActive = selectedItems.every((i) => i.is_active);
    const newActive = !allActive;
    const label = newActive ? "Aktifkan" : "Nonaktifkan";
    setBulkDeleting(true);
    try {
      await Promise.all(ids.map((id) => api.updateKnowledge(id, { is_active: newActive } as any)));
      toast.success(`${ids.length} data berhasil ${label.toLowerCase()}`);
      setSelectedIds(new Set());
      fetchItems();
    } catch {
      toast.error(`Gagal ${label.toLowerCase()} data`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    try {
      await api.bulkDeleteKnowledge(ids);
      toast.success(`${ids.length} data berhasil dihapus`);
      setSelectedIds(new Set());
      fetchItems();
    } catch {
      toast.error("Gagal menghapus data");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <Card className="rounded-2xl border shadow-soft overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Knowledge Base</h2>
            <p className="text-sm text-muted-foreground">
              {loading ? "Memuat..." : `${items.length} data tersimpan — gunakan sebagai referensi AI bot`}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <CardContent className="border-t p-5 space-y-6">
              {/* Tabs */}
              <div className="flex gap-1 rounded-xl bg-muted/50 p-1 w-fit">
                {[
                  { id: "manual" as Tab, label: "Manual Entry", icon: Plus },
                  { id: "url" as Tab, label: "Import URL", icon: Globe },
                  { id: "file" as Tab, label: "Upload File", icon: Upload },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      tab === t.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab: Manual Entry */}
              {tab === "manual" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 space-y-4"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Tambah Manual Entry
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Title *</label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Judul atau pertanyaan"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Category</label>
                      <Input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="general, harga, layanan, dll"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleManualAdd}
                        disabled={submitting}
                        className="w-full rounded-xl h-10 shadow-soft"
                      >
                        {submitting ? (
                          <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menyimpan</>
                        ) : (
                          <><Save className="h-4 w-4 mr-1" /> Simpan</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Content *</label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Tulis konten atau jawaban disini..."
                      rows={4}
                      className="rounded-xl resize-y min-h-[100px]"
                    />
                  </div>
                </motion.div>
              )}

              {/* Tab: Import URL */}
              {tab === "url" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-800 p-5 space-y-3"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    Import from URL
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Masukkan URL halaman web, Markdown, teks, atau JSON. HTML akan diekstrak konten utamanya secara otomatis.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 rounded-xl"
                    />
                    <Button
                      onClick={handleUrlImport}
                      disabled={importingUrl || !url.trim()}
                      className="rounded-xl shadow-soft"
                    >
                      {importingUrl ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Import</>
                      ) : (
                        <><Link className="h-4 w-4 mr-1" /> Import</>
                      )}
                    </Button>
                  </div>

                  {/* Crawl toggle */}
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={urlCrawl}
                      onChange={(e) => setUrlCrawl(e.target.checked)}
                      className="rounded border-muted-foreground/30"
                    />
                    <Globe className="h-3 w-3 text-blue-500" />
                    Crawl seluruh website (ikuti semua link internal)
                  </label>

                  {urlCrawl && (
                    <div className="flex gap-3 pl-5">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Max Halaman</label>
                        <Input
                          type="number"
                          value={urlMaxPages}
                          onChange={(e) => setUrlMaxPages(Number(e.target.value))}
                          min={1}
                          max={200}
                          className="h-8 rounded-lg text-xs"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Max Depth</label>
                        <Input
                          type="number"
                          value={urlMaxDepth}
                          onChange={(e) => setUrlMaxDepth(Number(e.target.value))}
                          min={1}
                          max={10}
                          className="h-8 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={urlGenerateAi}
                      onChange={(e) => setUrlGenerateAi(e.target.checked)}
                      className="rounded border-muted-foreground/30"
                    />
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Generate Q&A otomatis dengan AI (butuh OPENAI_API_KEY)
                  </label>

                  {/* Crawl progress */}
                  {importingUrl && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
                        <span className="flex-1">{crawlStatusText || "Mencrawl website, mohon tunggu..."}</span>
                        <span className="font-mono text-xs font-semibold tabular-nums">{crawlProgress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${crawlProgress}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab: Upload File */}
              {tab === "file" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                      dragging
                        ? "border-primary bg-primary/10 scale-[1.01]"
                        : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".md,.txt,.json,.pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className={`h-8 w-8 mx-auto mb-3 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-medium text-sm">
                      {dragging ? "Drop files here" : "Drag & drop files or click to upload"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports <strong>.md</strong>, <strong>.txt</strong>, <strong>.json</strong>, and <strong>.pdf</strong> files
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" /> PDF diproses dengan pdf-parse
                      <span className="mx-1.5">•</span>
                      <CheckCircle2 className="h-3 w-3" /> HTML diekstrak dengan Readability
                      <span className="mx-1.5">•</span>
                      <CheckCircle2 className="h-3 w-3" /> Markdown split by ## headings
                    </div>
                    {importingFile && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing files...
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer justify-center">
                    <input
                      type="checkbox"
                      checked={fileGenerateAi}
                      onChange={(e) => setFileGenerateAi(e.target.checked)}
                      className="rounded border-muted-foreground/30"
                    />
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Generate Q&A otomatis dengan AI (butuh OPENAI_API_KEY)
                  </label>
                </motion.div>
              )}

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari data..."
                    className="pl-9 rounded-xl h-9"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-9 pl-9 pr-8 rounded-xl border bg-background text-sm appearance-none cursor-pointer"
                  >
                    <option value="all">Semua kategori</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select & Bulk Delete */}
              {filtered.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-muted-foreground/30 h-4 w-4"
                    />
                    <span className="text-muted-foreground">
                      {selectedIds.size > 0
                        ? `${selectedIds.size} dari ${filtered.length} dipilih`
                        : "Pilih semua"}
                    </span>
                  </label>
                  {selectedIds.size > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkToggle}
                        disabled={bulkDeleting}
                        className="rounded-xl h-9"
                      >
                        {bulkDeleting ? (
                          <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Memproses...</>
                        ) : items.filter((i) => selectedIds.has(i.id)).every((i) => i.is_active) ? (
                          <><X className="h-4 w-4 mr-1" /> Nonaktifkan</>
                        ) : (
                          <><CheckCircle2 className="h-4 w-4 mr-1" /> Aktifkan</>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={bulkDeleting}
                        className="rounded-xl h-9"
                      >
                        {bulkDeleting ? (
                          <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menghapus...</>
                        ) : (
                          <><Trash2 className="h-4 w-4 mr-1" /> Hapus {selectedIds.size} data</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Knowledge List */}
              <div className="space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="text-sm">Belum ada data knowledge base.</p>
                    <p className="text-xs">Tambahkan data melalui form di atas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <AnimatePresence>
                      {filtered.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: (i % 12) * 0.03 }}
                          className={`group relative flex flex-col gap-2 rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-soft ${
                            item.is_active
                              ? "bg-card hover:border-primary/30"
                              : "bg-muted/30 opacity-60 hover:opacity-80"
                          }`}
                        >
                          {/* Checkbox */}
                          <div className="absolute top-3 left-3 z-10">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleSelect(item.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-muted-foreground/30 h-4 w-4"
                            />
                          </div>

                          {/* Active toggle */}
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`absolute top-2 right-2 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                              item.is_active
                                ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                            title={item.is_active ? "Klik untuk nonaktifkan" : "Klik untuk aktifkan"}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${item.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                            {item.is_active ? "Aktif" : "Nonaktif"}
                          </button>

                          {editing === item.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="text-sm font-semibold rounded-lg"
                                placeholder="Title"
                              />
                              <Input
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="text-xs rounded-lg"
                                placeholder="Category"
                              />
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={3}
                                className="text-sm rounded-lg resize-y"
                                placeholder="Content"
                              />
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => handleEdit(item.id)} className="rounded-lg h-7 text-xs">
                                  <Save className="h-3 w-3 mr-1" /> Simpan
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditing(null)} className="rounded-lg h-7 text-xs">
                                  <X className="h-3 w-3 mr-1" /> Batal
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2 pl-7">
                                <h3 className="font-semibold leading-snug text-sm line-clamp-2">{item.question}</h3>
                                <Badge variant="secondary" className="shrink-0 text-[10px] h-5">
                                  {item.category}
                                </Badge>
                              </div>
                              <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed pl-7">{item.answer}</p>
                              <div className="mt-auto pt-2 flex items-center justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100 pl-7">
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                                <div className="flex gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => openView(item)} title="Lihat/Edit">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)} disabled={deletingIds.has(item.id)}>
                                    {deletingIds.has(item.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Overlay View/Edit */}
      <AnimatePresence>
        {viewingId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6"
            onClick={(e) => { if (e.target === e.currentTarget) closeView(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative flex w-full max-w-4xl flex-col rounded-2xl border bg-background shadow-2xl"
              style={{ maxHeight: "90vh" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h2 className="text-lg font-bold">Edit Knowledge Entry</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={closeView}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Title / Pertanyaan</label>
                    <Input
                      value={viewTitle}
                      onChange={(e) => { setViewTitle(e.target.value); setViewDirty(true); }}
                      className="rounded-xl text-sm"
                      placeholder="Judul atau pertanyaan"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <Input
                      value={viewCategory}
                      onChange={(e) => { setViewCategory(e.target.value); setViewDirty(true); }}
                      className="rounded-xl text-sm"
                      placeholder="general, harga, layanan"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Content / Jawaban</label>
                  <Textarea
                    value={viewContent}
                    onChange={(e) => { setViewContent(e.target.value); setViewDirty(true); }}
                    className="rounded-xl text-sm min-h-[300px] resize-y"
                    placeholder="Isi konten..."
                    style={{ minHeight: "40vh" }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
                <Button variant="outline" onClick={closeView} className="rounded-xl">
                  Batal
                </Button>
                <Button onClick={handleViewSave} disabled={viewSaving} className="rounded-xl shadow-soft">
                  {viewSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menyimpan</> : <><Save className="h-4 w-4 mr-1" /> Simpan</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
