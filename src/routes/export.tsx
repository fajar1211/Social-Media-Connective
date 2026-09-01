import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore, type Status, type Platform } from "@/lib/content-store";

export const Route = createFileRoute("/export")({
  head: () => ({
    meta: [
      { title: "Export Reports — Social Media Connective" },
      { name: "description", content: "Export content reports and analytics." },
      { property: "og:title", content: "Export Reports — Social Media Connective" },
    ],
  }),
  component: ExportPage,
});

function generateCSV(data: Record<string, string | number>[], headers: string[]): string {
  const csvHeaders = headers.join(",");
  const csvRows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [csvHeaders, ...csvRows].join("\n");
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ExportPage() {
  const { content, clients } = useStore();
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  const filtered = useMemo(() => {
    const now = new Date();
    return content.filter((item) => {
      if (clientFilter !== "all" && item.client !== clientFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (platformFilter !== "all" && item.platform !== platformFilter) return false;

      if (dateRange !== "all") {
        const itemDate = new Date(item.date);
        const daysAgo = parseInt(dateRange);
        const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        if (itemDate < cutoff) return false;
      }

      return true;
    });
  }, [content, clientFilter, statusFilter, platformFilter, dateRange]);

  const exportContentCSV = () => {
    if (filtered.length === 0) {
      toast.error("No content to export");
      return;
    }

    const headers = [
      "Title",
      "Client",
      "Platform",
      "Type",
      "Status",
      "Date",
      "Caption",
      "Hashtags",
      "CTA",
      "Notes",
      "Scheduled Date",
      "Scheduled Time",
    ];

    const data = filtered.map((item) => ({
      Title: item.title,
      Client: item.client,
      Platform: item.platform,
      Type: item.type,
      Status: item.status,
      Date: item.date,
      Caption: item.caption,
      Hashtags: item.hashtags.join(", "),
      CTA: item.cta,
      Notes: item.notes || "",
      "Scheduled Date": item.scheduledDate || "",
      "Scheduled Time": item.scheduledTime || "",
    }));

    const csv = generateCSV(data, headers);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `content-report-${date}.csv`, "text/csv");
    toast.success(`Exported ${filtered.length} items`);
  };

  const exportSummaryCSV = () => {
    const statusCounts: Record<string, number> = {};
    const platformCounts: Record<string, number> = {};
    const clientCounts: Record<string, number> = {};

    filtered.forEach((item) => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      platformCounts[item.platform] = (platformCounts[item.platform] || 0) + 1;
      clientCounts[item.client] = (clientCounts[item.client] || 0) + 1;
    });

    const headers = ["Category", "Name", "Count", "Percentage"];
    const total = filtered.length;
    const data: Record<string, string | number>[] = [];

    Object.entries(statusCounts).forEach(([name, count]) => {
      data.push({
        Category: "Status",
        Name: name,
        Count: count,
        Percentage: total > 0 ? `${Math.round((count / total) * 100)}%` : "0%",
      });
    });

    Object.entries(platformCounts).forEach(([name, count]) => {
      data.push({
        Category: "Platform",
        Name: name,
        Count: count,
        Percentage: total > 0 ? `${Math.round((count / total) * 100)}%` : "0%",
      });
    });

    Object.entries(clientCounts).forEach(([name, count]) => {
      data.push({
        Category: "Client",
        Name: name,
        Count: count,
        Percentage: total > 0 ? `${Math.round((count / total) * 100)}%` : "0%",
      });
    });

    const csv = generateCSV(data, headers);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `summary-report-${date}.csv`, "text/csv");
    toast.success("Summary report exported");
  };

  const exportCalendarCSV = () => {
    const scheduled = filtered.filter((item) => item.scheduledDate);
    if (scheduled.length === 0) {
      toast.error("No scheduled content to export");
      return;
    }

    const headers = [
      "Date",
      "Time",
      "Title",
      "Client",
      "Platform",
      "Type",
      "Status",
      "Caption",
    ];

    const data = scheduled
      .sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""))
      .map((item) => ({
        Date: item.scheduledDate || item.date,
        Time: item.scheduledTime || "",
        Title: item.title,
        Client: item.client,
        Platform: item.platform,
        Type: item.type,
        Status: item.status,
        Caption: item.caption.slice(0, 100),
      }));

    const csv = generateCSV(data, headers);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `calendar-report-${date}.csv`, "text/csv");
    toast.success(`Exported ${scheduled.length} scheduled items`);
  };

  return (
    <>
      <PageHeader
        title="Export Reports"
        subtitle="Download content reports and analytics data."
      />

      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-4 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Suggested">Suggested</SelectItem>
                <SelectItem value="Additional">Additional</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="X / Twitter">X / Twitter</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Blog">Blog</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""} match your filters
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
                <FileSpreadsheet className="size-5 text-blue-600" />
              </div>
              <CardTitle className="text-base">Content Report</CardTitle>
              <CardDescription>
                Full content data with titles, captions, hashtags, and metadata.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={exportContentCSV} className="w-full">
                <Download className="mr-2 size-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-100">
                <FileText className="size-5 text-green-600" />
              </div>
              <CardTitle className="text-base">Summary Report</CardTitle>
              <CardDescription>
                Aggregated counts by status, platform, and client with percentages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={exportSummaryCSV} className="w-full">
                <Download className="mr-2 size-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100">
                <Calendar className="size-5 text-purple-600" />
              </div>
              <CardTitle className="text-base">Calendar Report</CardTitle>
              <CardDescription>
                Scheduled content with dates, times, and platform details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={exportCalendarCSV} className="w-full">
                <Download className="mr-2 size-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-4 text-green-500" />
            <div>
              <p className="text-sm font-medium">Export Tips</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                <li>• Use filters to export specific clients, platforms, or date ranges</li>
                <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet app</li>
                <li>• Calendar report only includes content with scheduled dates</li>
                <li>• Summary report shows breakdown by status, platform, and client</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
