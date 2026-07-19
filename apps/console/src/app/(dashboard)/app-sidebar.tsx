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
  FileText,
  ArrowLeftRight,
  Globe,
  Users,
  Star,
  Vote,
  Map,
  Megaphone,
  LogOut,
  ChevronUp,
  User2,
} from "lucide-react";
import { SubjectSwitcher } from "./subject-switcher";

const PERSONAL_NAV = [
  { href: "/accreditation", label: "My Power", icon: Star },
  { href: "/delegations", label: "Delegations", icon: ArrowLeftRight },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
];

const COMMUNITY_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/elections", label: "Elections", icon: Vote },
  { href: "/communities", label: "Communities", icon: Globe },
  { href: "/map", label: "Map", icon: Map },
  { href: "/members", label: "Members", icon: Users },
];

export function AppSidebar({
  userEmail,
  subjects,
  activeSubject,
}: {
  userEmail: string;
  subjects: string[];
  activeSubject: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function renderNav(items: typeof PERSONAL_NAV) {
    return (
      <SidebarMenu>
        {items.map((item) => {
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
    );
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-sm font-bold">
            L
          </div>
          <div>
            <p className="text-sm font-semibold">Loop</p>
            <p className="text-xs text-muted-foreground">Console</p>
          </div>
        </div>
        <SubjectSwitcher subjects={subjects} active={activeSubject} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Personal</SidebarGroupLabel>
          <SidebarGroupContent>{renderNav(PERSONAL_NAV)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Community</SidebarGroupLabel>
          <SidebarGroupContent>{renderNav(COMMUNITY_NAV)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton>
                    <User2 className="h-4 w-4" />
                    <span className="truncate text-xs">{userEmail}</span>
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
