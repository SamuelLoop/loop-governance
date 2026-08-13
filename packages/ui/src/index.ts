/**
 * @loop/ui — Signal Pulse component library
 *
 * Root export. Barrel-re-exports every base primitive plus the shared
 * `cn()` class-merge helper. Web-only (DOM primitives, Tailwind classes,
 * lucide-react icons) — apps/mobile must never import from here. The
 * RN-safe boundary lives at a separate `./power-tree` subpath (not yet
 * built — see sessions/web-eng-plan-output.md task T1/decision 6).
 *
 * Consumers: apps/console, apps/admin, apps/portal only.
 */

export * from "./lib/utils";
export * from "./hooks/use-mobile";
export * from "./theme/theme-init-script";
export * from "./theme/theme-toggle";
export * from "./theme/fonts";

export * from "./components/glass";
export * from "./components/live-dot";
export * from "./components/data-table";
export * from "./components/status-chip";
export * from "./components/stat-tile";
export * from "./components/vote";
export * from "./components/delegation-table";
export * from "./components/accreditation-progress";
export * from "./components/give-power-drawer";

export * from "./components/ui/avatar";
export * from "./components/ui/badge";
export * from "./components/ui/breadcrumb";
export * from "./components/ui/button";
export * from "./components/ui/card";
export * from "./components/ui/dialog";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/input";
export * from "./components/ui/label";
export * from "./components/ui/progress";
export * from "./components/ui/select";
export * from "./components/ui/separator";
export * from "./components/ui/sheet";
export * from "./components/ui/sidebar";
export * from "./components/ui/skeleton";
export * from "./components/ui/table";
export * from "./components/ui/tabs";
export * from "./components/ui/textarea";
export * from "./components/ui/tooltip";
