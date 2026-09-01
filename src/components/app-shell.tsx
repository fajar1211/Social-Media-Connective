import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Files,
  PenLine,
  Upload,
  Lightbulb,
  PlusCircle,
  Send,
  CheckCircle2,
  Trash2,
  Users,
  Share2,
  Settings,
  Menu,
  LogOut,
  Shield,
  Calendar,
  BarChart3,
  LayoutTemplate,
  Download,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const adminNav = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/content", label: "All Content", icon: Files },
      { to: "/content/create", label: "Create Content", icon: PenLine },
      { to: "/templates", label: "Templates", icon: LayoutTemplate },
      { to: "/import", label: "Import", icon: Upload },
      { to: "/export", label: "Export", icon: Download },
    ],
  },
  {
    label: "Content Status",
    items: [
      { to: "/suggested", label: "Suggested Posts", icon: Lightbulb },
      { to: "/additional", label: "Additional Posts", icon: PlusCircle },
      { to: "/submitted", label: "Submitted", icon: Send },
      { to: "/approved", label: "Approved", icon: CheckCircle2 },
      { to: "/deleted", label: "Deleted", icon: Trash2 },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "/clients", label: "Clients", icon: Users },
      { to: "/users", label: "Users", icon: Shield },
      { to: "/platforms", label: "Platforms", icon: Share2 },
    ],
  },
  {
    label: "System",
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];

const clientNav = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/content", label: "All Content", icon: Files },
      { to: "/content/create", label: "Create Content", icon: PenLine },
      { to: "/templates", label: "Templates", icon: LayoutTemplate },
      { to: "/import", label: "Import", icon: Upload },
      { to: "/export", label: "Export", icon: Download },
    ],
  },
  {
    label: "Content Status",
    items: [
      { to: "/suggested", label: "Suggested Posts", icon: Lightbulb },
      { to: "/additional", label: "Additional Posts", icon: PlusCircle },
      { to: "/submitted", label: "Submitted", icon: Send },
      { to: "/approved", label: "Approved", icon: CheckCircle2 },
      { to: "/deleted", label: "Deleted", icon: Trash2 },
    ],
  },
  {
    label: "System",
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, profile, signOut } = useAuth();
  const nav = profile?.role === "admin" ? adminNav : clientNav;
  const roleLabel = profile?.role === "admin" ? "Admin" : "Client";

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Social Media Connective" className="size-8" />
          <div>
            <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Social Media Connective
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {nav.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    activeOptions={{ exact: item.to === "/" }}
                    className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                    activeProps={{
                      className: "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                    }}
                  >
                    <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t px-3 py-3">
        {user && (
          <div className="mb-2 px-2">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user.email}</p>
            {profile?.full_name && (
              <p className="text-xs text-muted-foreground truncate">{profile.full_name}</p>
            )}
          </div>
        )}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
          Sign Out
        </button>
      </div>
      <div className="border-t px-5 py-4 text-xs text-muted-foreground">
        Simple. Organized. Professional.
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setOpen(false), [pathname]);

  const isPublicPage = pathname === "/" || pathname === "/auth";

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r lg:block">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Social Media Connective" className="size-6" />
          <div>
            <p className="text-sm font-semibold">Social Media Connective</p>
            <p className="text-[11px] text-muted-foreground">Marketing Platform</p>
          </div>
        </div>
      </header>

      <main className={cn("lg:pl-60")}>
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
