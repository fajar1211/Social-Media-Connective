import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore, type ContentItem, type Status, type Platform } from "@/lib/content-store";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Content Calendar — Social Media Connective" },
      { name: "description", content: "Plan and schedule your content with a visual calendar." },
      { property: "og:title", content: "Content Calendar — Social Media Connective" },
    ],
  }),
  component: CalendarPage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusColors: Record<Status, string> = {
  Suggested: "bg-blue-100 text-blue-700 border-blue-200",
  Additional: "bg-purple-100 text-purple-700 border-purple-200",
  Submitted: "bg-amber-100 text-amber-700 border-amber-200",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Deleted: "bg-red-100 text-red-700 border-red-200",
};

const platformColors: Record<Platform, string> = {
  Facebook: "bg-[#1877F2]",
  Instagram: "bg-[#E4405F]",
  "X / Twitter": "bg-black",
  LinkedIn: "bg-[#0A66C2]",
  Blog: "bg-orange-500",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function CalendarDay({
  day,
  month,
  year,
  items,
  isToday,
  onSelect,
}: {
  day: number;
  month: number;
  year: number;
  items: ContentItem[];
  isToday: boolean;
  onSelect: (item: ContentItem) => void;
}) {
  return (
    <div
      className={`min-h-[100px] rounded-lg border p-2 transition-colors hover:bg-accent/30 ${
        isToday ? "border-primary bg-primary/5" : "bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium ${
            isToday
              ? "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }`}
        >
          {day}
        </span>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">{items.length}</span>
        )}
      </div>
      <div className="mt-1 space-y-1">
        {items.slice(0, 3).map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full rounded border p-1 text-left text-xs transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-1">
              <div className={`size-1.5 rounded-full ${platformColors[item.platform] || "bg-gray-400"}`} />
              <span className="truncate font-medium">{item.title}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              <Badge
                variant="outline"
                className={`px-1 py-0 text-[9px] ${statusColors[item.status]}`}
              >
                {item.status}
              </Badge>
              {item.scheduledTime && (
                <span className="text-[9px] text-muted-foreground">{item.scheduledTime}</span>
              )}
            </div>
          </button>
        ))}
        {items.length > 3 && (
          <p className="text-center text-[10px] text-muted-foreground">
            +{items.length - 3} more
          </p>
        )}
      </div>
    </div>
  );
}

function CalendarPage() {
  const { content, clients } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const filteredContent = useMemo(() => {
    return content.filter((item) => {
      if (clientFilter !== "all" && item.client !== clientFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    });
  }, [content, clientFilter, statusFilter]);

  const contentByDate = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    for (const item of filteredContent) {
      const dateKey = item.scheduledDate || item.date;
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(item);
      }
    }
    return map;
  }, [filteredContent]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const scheduledCount = filteredContent.filter(
    (item) => item.scheduledDate || item.date
  ).length;

  return (
    <>
      <PageHeader
        title="Content Calendar"
        subtitle={`${MONTHS[month]} ${year} · ${scheduledCount} scheduled content`}
        actions={
          <Button asChild>
            <Link to="/content/create">
              <CalendarIcon className="mr-2 size-4" />
              Create Content
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[160px]">
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
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Suggested">Suggested</SelectItem>
              <SelectItem value="Additional">Additional</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border bg-card shadow-soft">
          <div className="grid grid-cols-7 border-b">
            {DAYS.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-card" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = formatDateKey(year, month, day);
              const items = contentByDate[dateKey] || [];
              return (
                <CalendarDay
                  key={day}
                  day={day}
                  month={month}
                  year={year}
                  items={items}
                  isToday={isToday(day)}
                  onSelect={setSelectedItem}
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium">Platforms:</span>
            {Object.entries(platformColors).map(([name, color]) => (
              <div key={name} className="flex items-center gap-1">
                <div className={`size-2 rounded-full ${color}`} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColors[selectedItem.status]}>
                  {selectedItem.status}
                </Badge>
                <span className="text-muted-foreground">{selectedItem.platform}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{selectedItem.type}</span>
              </div>
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-medium">{selectedItem.client}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {selectedItem.scheduledDate || selectedItem.date}
                  {selectedItem.scheduledTime && ` at ${selectedItem.scheduledTime}`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Caption</p>
                <p className="mt-1 whitespace-pre-wrap">{selectedItem.caption}</p>
              </div>
              {selectedItem.hashtags.length > 0 && (
                <div>
                  <p className="text-muted-foreground">Hashtags</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedItem.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/content">View in Content</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
