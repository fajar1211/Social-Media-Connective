import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Files,
  CheckCircle2,
  Clock,
  Users,
  BarChart3,
  PieChart,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore, type Platform, type Status } from "@/lib/content-store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Social Media Connective" },
      { name: "description", content: "Content performance analytics and insights." },
      { property: "og:title", content: "Analytics — Social Media Connective" },
    ],
  }),
  component: AnalyticsPage,
});

const statusColors: Record<Status, string> = {
  Suggested: "bg-blue-500",
  Additional: "bg-purple-500",
  Submitted: "bg-amber-500",
  Approved: "bg-green-500",
  Deleted: "bg-red-500",
};

const platformColors: Record<Platform, string> = {
  Facebook: "#1877F2",
  Instagram: "#E4405F",
  "X / Twitter": "#000000",
  LinkedIn: "#0A66C2",
  Blog: "#F97316",
};

function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
}: {
  title: string;
  value: number;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
          </div>
        </div>
        {change !== undefined && (
          <div className="mt-4 flex items-center gap-1">
            {changeType === "increase" ? (
              <TrendingUp className="size-4 text-green-500" />
            ) : (
              <TrendingDown className="size-4 text-red-500" />
            )}
            <span
              className={`text-sm font-medium ${
                changeType === "increase" ? "text-green-500" : "text-red-500"
              }`}
            >
              {change}%
            </span>
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BarChartItem({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const { content, clients } = useStore();

  const stats = useMemo(() => {
    const total = content.length;
    const approved = content.filter((c) => c.status === "Approved").length;
    const pending = content.filter(
      (c) => c.status === "Suggested" || c.status === "Additional" || c.status === "Submitted"
    ).length;
    const deleted = content.filter((c) => c.status === "Deleted").length;

    return { total, approved, pending, deleted };
  }, [content]);

  const platformStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of content) {
      counts[item.platform] = (counts[item.platform] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([platform, count]) => ({
        platform: platform as Platform,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [content]);

  const clientStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of content) {
      counts[item.client] = (counts[item.client] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([client, count]) => ({ client, count }))
      .sort((a, b) => b.count - a.count);
  }, [content]);

  const statusStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of content) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({
      status: status as Status,
      count,
    }));
  }, [content]);

  const recentContent = useMemo(() => {
    return [...content]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [content]);

  const maxPlatformCount = platformStats.length > 0 ? platformStats[0].count : 0;
  const maxClientCount = clientStats.length > 0 ? clientStats[0].count : 0;
  const maxStatusCount = statusStats.length > 0 ? Math.max(...statusStats.map((s) => s.count)) : 0;

  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Content performance and insights across all clients."
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Content"
            value={stats.total}
            icon={Files}
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon={CheckCircle2}
          />
          <StatCard
            title="Pending Review"
            value={stats.pending}
            icon={Clock}
          />
          <StatCard
            title="Active Clients"
            value={clients.filter((c) => c.active).length}
            icon={Users}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4" />
                Content by Platform
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {platformStats.length > 0 ? (
                platformStats.map((item) => (
                  <BarChartItem
                    key={item.platform}
                    label={item.platform}
                    value={item.count}
                    maxValue={maxPlatformCount}
                    color={platformColors[item.platform] || "#6B7280"}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="size-4" />
                Content by Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusStats.length > 0 ? (
                statusStats.map((item) => (
                  <BarChartItem
                    key={item.status}
                    label={item.status}
                    value={item.count}
                    maxValue={maxStatusCount}
                    color={
                      item.status === "Approved"
                        ? "#22C55E"
                        : item.status === "Submitted"
                        ? "#F59E0B"
                        : item.status === "Suggested"
                        ? "#3B82F6"
                        : item.status === "Additional"
                        ? "#A855F7"
                        : "#EF4444"
                    }
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" />
                Content by Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clientStats.length > 0 ? (
                clientStats.map((item) => (
                  <BarChartItem
                    key={item.client}
                    label={item.client}
                    value={item.count}
                    maxValue={maxClientCount}
                    color="#6366F1"
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4" />
                Approval Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="relative size-32">
                  <svg className="size-32 -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-muted"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeDasharray={`${approvalRate * 3.14} 314`}
                      className="text-green-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{approvalRate}%</span>
                    <span className="text-xs text-muted-foreground">Approved</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Content</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved</span>
                  <span className="font-medium text-green-500">{stats.approved}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deleted</span>
                  <span className="font-medium text-red-500">{stats.deleted}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Content</CardTitle>
          </CardHeader>
          <CardContent>
            {recentContent.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentContent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.client}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="size-2 rounded-full"
                            style={{ backgroundColor: platformColors[item.platform] || "#6B7280" }}
                          />
                          {item.platform}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(item.date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No content yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
