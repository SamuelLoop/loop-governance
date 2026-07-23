"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
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
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  Globe,
  Coins,
  PieChart,
  Flag,
  ScrollText,
  Settings,
  Shield,
  LogOut,
  ChevronUp,
} from "lucide-react";
import type { AdminRole } from "@/lib/admin-auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, minRole: "org_manager" as const },
  { href: "/members", label: "Members", icon: Users, minRole: "org_manager" as const },
  { href: "/communities", label: "Communities", icon: Globe, minRole: "org_manager" as const },
  { href: "/treasury", label: "Treasury", icon: Coins, minRole: "org_admin" as const },
  { href: "/allocations", label: "Allocations", icon: PieChart, minRole: "org_admin" as const },
  { href: "/moderation", label: "Moderation", icon: Flag, minRole: "org_manager" as const },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText, minRole: "org_manager" as const },
  { href: "/settings", label: "Settings", icon: Settings, minRole: "org_admin" as const },
];

const ROLE_LEVEL: Record<AdminRole, number> = {
  org_manager: 1,
  org_admin: 2,
  platform_admin: 3,
};

export function AppSidebar({
  userName,
  userAvatar,
  platformRole,
  orgName,
}: {
  userName: string;
  userAvatar: string | null;
  platformRole: AdminRole;
  orgName: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const roleLevel = ROLE_LEVEL[platformRole];

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => ROLE_LEVEL[item.minRole] <= roleLevel
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/20">
            <Shield className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Loop<span className="text-muted-foreground">_</span>
              <span className="text-red-500">cmbntr</span>
            </p>
            <p className="text-xs text-muted-foreground">Admin Console</p>
          </div>
        </div>
        {orgName && (
          <div className="mx-2 mb-1 rounded-md border border-border bg-secondary/50 px-3 py-1.5">
            <p className="text-xs text-muted-foreground">Organization</p>
            <p className="text-sm font-medium truncate">{orgName}</p>
          </div>
        )}
        {platformRole === "platform_admin" && (
          <div className="mx-2 mb-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5">
            <p className="text-xs font-medium text-destructive">Platform Admin</p>
            <p className="text-xs text-muted-foreground">All organizations</p>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton>
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-medium text-destructive">
                        {userName[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="truncate text-xs">{userName}</span>
                    <ChevronUp className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent side="top" className="w-56">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
