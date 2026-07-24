import { Info } from "lucide-react";

export function PageDescription({
  purpose,
  whenToUse,
}: {
  purpose: string;
  whenToUse: string;
}) {
  return (
    <div className="mb-6 flex gap-3 rounded-lg border border-border bg-card/60 p-4">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">What this is: </span>
          {purpose}
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">When to use it: </span>
          {whenToUse}
        </p>
      </div>
    </div>
  );
}
