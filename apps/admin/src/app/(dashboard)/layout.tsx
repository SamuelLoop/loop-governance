import { requireAdminSession } from "@/lib/admin-auth";
import { AppSidebar } from "./app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          userName={session.displayName}
          userAvatar={session.avatarUrl}
          platformRole={session.platformRole}
          orgName={session.whiteLabel?.name ?? null}
        />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b bg-background px-4">
            <div className="flex items-center">
              <SidebarTrigger className="md:hidden" />
              <span className="ml-3 text-sm font-semibold md:ml-0">
                {session.whiteLabel?.name ?? "Platform"} Admin
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-destructive">
                {session.platformRole.replace("_", " ")}
              </span>
            </div>
          </header>
          <main className="flex-1 px-4 py-4 md:px-8 md:py-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
