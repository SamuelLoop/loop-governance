// Re-exported from @loop/ui (packages/ui/src/components/ui/sidebar.tsx) —
// see packages/ui/README.md. This shim exists so the existing
// `@/components/ui/*` call sites across this app don't need touching
// this session (mechanical cleanup to import `@loop/ui` directly is
// eng-plan task T3.5, tracked separately). Do not add new logic here.
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@loop/ui";
