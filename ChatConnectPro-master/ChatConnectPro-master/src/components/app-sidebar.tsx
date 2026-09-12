import { Link, useRouterState } from "@tanstack/react-router";
import { signOut } from "@/lib/auth";
import {
  LayoutDashboard,
  MessagesSquare,
  BookOpen,
  Radio,
  Settings,
  LogOut,
  Bot,
  BarChart3,
  UserCog,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Percakapan", url: "/percakapan", icon: MessagesSquare },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Channel", url: "/channel", icon: Radio },
  { title: "Knowledge Base", url: "/knowledge", icon: BookOpen },
  { title: "Otomatisasi", url: "/otomatisasi", icon: Settings },
  { title: "Pengaturan", url: "/pengaturan", icon: UserCog },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-soft">
            <Bot className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">ChatConnect Pro</span>
              <span className="text-[10px] text-muted-foreground">AI Social Media Automation</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = path === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={
                        active
                          ? "bg-accent text-primary font-semibold rounded-lg hover:bg-accent"
                          : "rounded-lg"
                      }
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={() => { signOut(); window.location.href = "/"; }} className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
