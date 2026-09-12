import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signOut, getAuthUser, type AuthUser } from "@/lib/auth";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Smartphone,
  MessageSquare,
  CalendarClock,
  Settings,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  Bot,
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/backend/dashboard", icon: LayoutDashboard },
  { title: "Users", url: "/backend/users", icon: Users },
  { title: "Instances", url: "/backend/instances", icon: Smartphone },
  { title: "Chats", url: "/backend/chats", icon: MessageSquare },
  { title: "Scheduled", url: "/backend/scheduled", icon: CalendarClock },
  { title: "Settings", url: "/backend/settings", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getAuthUser());
  }, []);

  return (
    <AuthGuard loginPath="/backend/login">
    <div className="flex min-h-screen bg-background">
      <aside
        className={`fixed left-0 top-0 z-40 h-full border-r bg-card transition-all duration-200 flex flex-col ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-white shadow-soft">
            <Shield className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold">Admin Panel</span>
              <span className="text-[10px] text-muted-foreground">ChatConnect Pro</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map((item) => {
            const active = path === item.url;
            return (
              <Link
                key={item.url}
                to={item.url}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4 mx-auto" /> : <><ChevronLeft className="h-4 w-4" /> Collapse</>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 transition-all duration-200 ${collapsed ? "ml-16" : "ml-56"}`}>
        <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {menuItems.find((m) => m.url === path)?.title || "Admin"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">
                    {user?.name?.charAt(0) || "A"}
                  </span>
                </div>
                <span className="hidden sm:inline text-xs">{user?.email}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { signOut(); navigate({ to: "/backend/login" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}
