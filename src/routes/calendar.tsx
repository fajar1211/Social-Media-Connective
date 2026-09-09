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

const platformIcons: Record<Platform, React.ReactNode> = {
  Facebook: (
    <svg className="size-3 fill-white" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  Instagram: (
    <svg className="size-3 fill-white" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  "X / Twitter": (
    <svg className="size-3 fill-white" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  LinkedIn: (
    <svg className="size-3 fill-white" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  Blog: (
    <svg className="size-3 fill-white" viewBox="0 0 24 24">
      <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.009 12c0-1.298.283-2.532.784-3.648L7.694 19.09A8.013 8.013 0 013.009 12zm8.991 9c-.962 0-1.896-.14-2.785-.401l2.965-8.64 3.042 8.345a.588.588 0 00.046.093A7.987 7.987 0 0112 21zm1.251-13.368l-3.468 10.114a.532.532 0 01-.031.078 7.955 7.955 0 01-2.245-5.435c0-3.309 2.577-6.037 5.812-6.32l-.068 1.563zm5.037-1.611L13.338 18.8a7.96 7.96 0 012.377.238c.339-.825.53-1.726.53-2.675 0-2.421-1.318-4.536-3.281-5.673l-.031-.042z"/>
    </svg>
  ),
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
              <div className={`flex size-4 items-center justify-center rounded ${platformColors[item.platform] || "bg-gray-400"}`}>
                {platformIcons[item.platform] || <span className="text-[8px] text-white font-bold">{item.platform[0]}</span>}
              </div>
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
  const [statusFilter, setStatusFilter] = useState<string>("Approved");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const filteredContent = useMemo(() => {
    return content.filter((item) => {
      if (item.status === "Deleted") return false;
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
                <div className={`flex size-4 items-center justify-center rounded ${color}`}>
                  {platformIcons[name as Platform]}
                </div>
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
