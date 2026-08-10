// Re-exported from @loop/ui (packages/ui/src/components/ui/dropdown-menu.tsx) —
// see packages/ui/README.md. This shim exists so the existing
// `@/components/ui/*` call sites across this app don't need touching
// this session (mechanical cleanup to import `@loop/ui` directly is
// eng-plan task T3.5, tracked separately). Do not add new logic here.
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@loop/ui";
