import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
import { ContentTypeBadge, PlatformBadge, StatusBadge } from "@/components/badges";
import { actions, parseImportFile, useStore, type ContentItem } from "@/lib/content-store";

export const Route = createFileRoute("/import")({
  validateSearch: (search: Record<string, unknown>) => ({
    clientId: (search["clientId"] as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Import Content — Social Media Connective Admin" },
      { name: "description", content: "Import existing marketing content into Social Media Connective." },
      { property: "og:title", content: "Import Content — Social Media Connective Admin" },
      { property: "og:description", content: "Import existing marketing content into Social Media Connective." },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const { clientId } = Route.useSearch();
  const { clients } = useStore();
  const [selectedClientId, setSelectedClientId] = useState(clientId || "");

  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [rows, setRows] = useState<Omit<ContentItem, "id">[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const selectedClient = clients.find((c: any) => c.id === selectedClientId);

  const resetAll = () => {
    setRows(null);
    setFileName(null);
    setUploadProgress(0);
    setSelected(new Set());
    setViewingIndex(null);
  };

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    resetAll();
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!/\.(md|txt)$/i.test(file.name)) {
      toast.error("Unsupported file. Use .md or .txt");
      return;
    }
    setFileName(file.name);
    setRows(null);
    setUploadProgress(0);
    setSelected(new Set());

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseImportFile(text, selectedClient?.name || "Unknown Client", selectedClient?.id);
      setRows(parsed);
      setUploadProgress(100);
      toast.success(`${file.name} parsed — ${parsed.length} posts found`);
    };
    reader.readAsText(file);
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
        toast.success(`${selectedRows.length} posts imported for ${selectedClient?.name}`);
        resetAll();
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
    <>
      <PageHeader
        title="Import Content"
        subtitle={selectedClient ? `Import existing marketing content for ${selectedClient.name}.` : "Select a client to import content."}
      />

      {/* Client Selector */}
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <label className="text-sm font-medium">Select Client</label>
        <select
          value={selectedClientId}
          onChange={(e) => handleClientChange(e.target.value)}
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">— Choose a client —</option>
          {clients.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Import Section — only show after client selected */}
      {selectedClientId && selectedClient && (
        <div className="mt-6 rounded-xl border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Import Posts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Import existing marketing content for {selectedClient.name}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".md,.txt"
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
                  onClick={resetAll}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={confirmImport} disabled={importing || selected.size === 0}>
                  {importing ? "Importing…" : `Import ${selected.size} Posts`}
                </Button>
              </div>
            </section>
          )}
        </div>
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
    </>
  );
}
