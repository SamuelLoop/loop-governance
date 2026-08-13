import * as React from "react"

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet"
import { cn } from "../lib/utils"

/**
 * GivePowerDrawer — session 3 inventory ("GivePowerDrawer | shadcn Sheet
 * | Delegation"), built for real in session `web-10-console-rollout.md`.
 * Wraps the existing `Sheet` primitive (already in `packages/ui`, unused
 * until now) so the delegate/accredit forms on
 * `apps/console/.../give-power/page.tsx` open in a slide-out panel
 * instead of taking two full-width inline panels on the page — the
 * actual form logic (`DelegateForm`/`AccreditForm`, both wired to their
 * own server actions) stays page-owned and is passed as `children`, same
 * division as every other primitive this session built.
 */

export interface GivePowerDrawerProps {
  trigger: React.ReactElement
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

function GivePowerDrawer({
  trigger,
  title,
  description,
  children,
  className,
}: GivePowerDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger render={trigger} />
      <SheetContent
        className={cn(
          "overflow-y-auto border-surface-border bg-background p-0",
          className
        )}
      >
        <SheetHeader className="border-b border-surface-border">
          <SheetTitle className="text-h2 font-bold text-text-primary">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-caption text-text-secondary">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="p-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

export { GivePowerDrawer }
