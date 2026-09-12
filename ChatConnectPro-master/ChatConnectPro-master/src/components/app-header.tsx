import { useEffect, useState } from "react";
import { Bell, Moon, Sun, Search, LogOut, User, Settings as SettingsIcon, PauseCircle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { getAuthUser, signOut, type AuthUser } from "@/lib/auth";
import { api, getActiveInstance } from "@/lib/api";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [botConnected, setBotConnected] = useState(false);
  const [botPaused, setBotPaused] = useState(false);
  const [botPhone, setBotPhone] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    setUser(getAuthUser());
  }, []);

  useEffect(() => {
    api.getProfile().then((p) => {
      if (p.logo_url) setLogoUrl(p.logo_url);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function check() {
      const instanceId = getActiveInstance();
      if (!instanceId) {
        setBotConnected(false);
        setBotPaused(false);
        setBotPhone(null);
        return;
      }
      api.getBotStatus(instanceId).then((status) => {
        setBotConnected(status.bot === "connected");
        setBotPaused(status.bot === "paused");
        setBotPhone(status.phone);
      }).catch(() => {
        setBotConnected(false);
        setBotPaused(false);
        setBotPhone(null);
      });
    }
    check();
    const id = setInterval(check, 5000);
    window.addEventListener("storage", check);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", check);
    };
  }, []);

  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  const pageTitle: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/percakapan": "Percakapan",
    "/analytics": "Analytics",
    "/channel": "Channel",
    "/knowledge": "Knowledge Base",
    "/otomatisasi": "Otomatisasi",
    "/pengaturan": "Pengaturan",
    "/profil": "Profil",
  };

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase()
    : "AD";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-xl shadow-soft">
      <SidebarTrigger className="rounded-lg" />

      <div className="hidden md:flex items-center text-sm font-medium text-foreground">
        {pageTitle[path] || "Dashboard"}
      </div>

      <div className="relative ml-auto hidden md:block w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari pesan, kontak..." className="pl-9 h-9 rounded-lg bg-muted/50 border-transparent focus-visible:bg-card" />
      </div>

      <Badge
        variant="outline"
        className={`gap-1.5 rounded-full px-2.5 py-1 ${
          botConnected
            ? "border-success/30 bg-success/10 text-success"
            : botPaused
            ? "border-amber-500/30 bg-amber-50 dark:bg-amber-950 text-amber-600"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}
      >
        {botPaused ? (
          <PauseCircle className="h-3 w-3" />
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${botConnected ? "bg-success animate-pulse" : "bg-destructive"}`} />
        )}
        <span className="text-xs font-medium">
          {botPhone ? botPhone : botPaused ? "Paused" : botConnected ? "Connected" : "Disconnected"}
        </span>
      </Badge>

      <Button variant="ghost" size="icon" onClick={toggle} className="rounded-lg">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative rounded-lg">
            <Bell className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 rounded-xl">
          <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Belum ada notifikasi
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-accent">
            <Avatar className="h-8 w-8">
              {logoUrl ? (
                <AvatarImage src={logoUrl} alt="Logo" className="object-cover" />
              ) : (
                <AvatarFallback className="bg-gradient-brand text-white text-xs font-semibold">{initials}</AvatarFallback>
              )}
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{user?.name || "Admin User"}</span>
              <span className="text-xs text-muted-foreground">{user?.email || "admin@marketingconnective.com"}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/profil" })} className="cursor-pointer"><User className="mr-2 h-4 w-4" /> Profil</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: "/pengaturan" })} className="cursor-pointer"><SettingsIcon className="mr-2 h-4 w-4" /> Pengaturan</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { signOut(); window.location.href = "/"; }} className="text-destructive cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
