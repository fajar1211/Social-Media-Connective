import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
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
import { ContentTypeBadge, PlatformBadge, StatusBadge } from "@/components/badges";
import { actions, type ContentItem, parseImportFile, useStore } from "@/lib/content-store";

export const Route = createFileRoute("/import")({
  validateSearch: (search: Record<string, unknown>) => ({
    clientId: (search.clientId as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Import Content — Social Media Connective Admin" },
      {
        name: "description",
        content: "Import existing marketing content into Social Media Connective.",
      },
      { property: "og:title", content: "Import Content — Social Media Connective Admin" },
      {
        property: "og:description",
        content: "Import existing marketing content into Social Media Connective.",
      },
    ],
  }),
  component: ImportPage,
});

const sample: Omit<ContentItem, "id">[] = [
  {
    title: "Hydrafacial: What to Expect",
    client: "Divine Medical Spa",
    platform: "Instagram",
    type: "Image",
    status: "Additional",
    date: new Date().toISOString().slice(0, 10),
    caption: "A quick walkthrough of your first Hydrafacial appointment.",
    hashtags: ["#Hydrafacial", "#SkinCare"],
    cta: "Book your session.",
    media: [
      "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=70",
    ],
  },
  {
    title: "3 Signs You Need a Dental Check-Up",
    client: "Northline Dental",
    platform: "Facebook",
    type: "Text Post",
    status: "Additional",
    date: new Date().toISOString().slice(0, 10),
    caption: "Sensitivity, bleeding gums and jaw pain shouldn't be ignored.",
    body: "Sensitivity, bleeding gums and jaw pain shouldn't be ignored. Here's why an early visit saves time and money.",
    hashtags: ["#DentalHealth", "#Northline"],
    cta: "Schedule a check-up.",
  },
  {
    title: "Why Recovery Days Matter",
    client: "Harbor Fitness Co.",
    platform: "LinkedIn",
    type: "Blog Article",
    status: "Additional",
    date: new Date().toISOString().slice(0, 10),
    caption: "Training hard is only half the equation.",
    body: "Training hard is only half the equation. Recovery is where adaptation happens…",
    hashtags: ["#Fitness", "#Recovery"],
    cta: "Read the full article.",
  },
];

function ImportPage() {
  const navigate = useNavigate();
  const { clientId } = Route.useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [rows, setRows] = useState<Omit<ContentItem, "id">[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const clients = useStore((s) => s.clients);
  const [selectedClientId, setSelectedClientId] = useState(clientId || clients[0]?.id || "");

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const ok = /\.(csv|xlsx?|json|md|txt|png|jpe?g|webp)$/i.test(file.name);
    if (!ok) {
      toast.error("Unsupported file. Use CSV, Excel, JSON, Markdown or images.");
      return;
    }
    setFileName(file.name);
    setRows(null);
    setUploadProgress(0);

    const isMarkdown = /\.(md|txt)$/i.test(file.name);

    if (isMarkdown) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const client = clients.find((c) => c.id === selectedClientId);
        const parsed = parseImportFile(text, client?.name || "Unknown Client");
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
          setRows(sample);
          toast.success(`${file.name} uploaded`);
        }
      }, 160);
    }
  };

  const confirmImport = () => {
    if (!rows) return;
    setImporting(true);
    setImportProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 25;
      setImportProgress(p);
      if (p >= 100) {
        clearInterval(t);
        actions.addMany(rows);
        setImporting(false);
        toast.success(`${rows.length} items imported`);
        navigate({ to: "/additional" });
      }
    }, 180);
  };

  return (
    <>
      <PageHeader
        title="Import Content"
        subtitle="Import existing marketing content into Social Media Connective."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card px-6 py-16 text-center transition-colors ${
          dragging ? "border-primary bg-accent/50" : "border-border"
        }`}
      >
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <UploadCloud className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium">Drag &amp; drop your files here</p>
        <p className="my-2 text-xs text-muted-foreground">or</p>
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          Browse Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".csv,.xls,.xlsx,.json,.md,.txt,image/*"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="mt-4 text-xs text-muted-foreground">Supported: CSV, Excel, JSON, Markdown (.md), Images</p>
      </div>

      {clients.length > 1 && (
        <div className="mt-4 rounded-xl border bg-card p-4 shadow-soft">
          <label className="text-sm font-medium">Import to Client</label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {fileName && (
        <div className="mt-4 rounded-xl border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-sm font-medium">{fileName}</span>
            <span className="ml-auto text-xs text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="mt-3 h-1.5" />
        </div>
      )}

      {rows && (
        <section className="mt-8">
          <h2 className="mb-4 text-base font-semibold">Import Preview</h2>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Content</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Content Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.title}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-muted-foreground">{r.client}</TableCell>
                    <TableCell>
                      <PlatformBadge platform={r.platform} />
                    </TableCell>
                    <TableCell>
                      <ContentTypeBadge type={r.type} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {importing && <Progress value={importProgress} className="mt-4 h-1.5" />}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRows(null);
                setFileName(null);
                setUploadProgress(0);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmImport} disabled={importing}>
              {importing ? "Importing…" : "Import Content"}
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
