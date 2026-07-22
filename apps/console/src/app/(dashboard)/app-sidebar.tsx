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
  Coins,
  Wallet,
  Shield,
  Package,
  LogOut,
  ChevronUp,
  User2,
  Activity,
} from "lucide-react";
import { SubjectSwitcher } from "./subject-switcher";

const PERSONAL_NAV = [
  { href: "/account", label: "My Account", icon: User2 },
  { href: "/badge", label: "My Badge", icon: Shield },
  { href: "/accreditation", label: "My Power", icon: Star },
  { href: "/earnings", label: "Earnings", icon: Wallet },
  { href: "/delegations", label: "Delegations", icon: ArrowLeftRight },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/claim", label: "Your Tokens", icon: Package },
  { href: "/token-activity", label: "Token Activity", icon: Activity },
];

const COMMUNITY_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/elections", label: "Elections", icon: Vote },
  { href: "/communities", label: "Communities", icon: Globe },
  { href: "/map", label: "Map", icon: Map },
  { href: "/members", label: "Members", icon: Users },
  { href: "/treasury", label: "Treasury", icon: Coins },
];

export function AppSidebar({
  userEmail,
  userName,
  userAvatar,
  subjects,
  activeSubject,
}: {
  userEmail: string;
  userName: string;
  userAvatar: string | null;
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
        <div className="flex items-center gap-2.5 px-2 py-2">
          <img src="/logo.png" alt="Loop_cmbntr" className="h-8 w-8 rounded-md" />
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Loop<span className="text-muted-foreground">_</span>
              <span className="text-red-500">cmbntr</span>
            </p>
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
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-medium text-primary">
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
