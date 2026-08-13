import { Info } from "lucide-react";
import { Glass } from "@loop/ui";

export function PageDescription({
  purpose,
  whenToUse,
}: {
  purpose: string;
  whenToUse: string;
}) {
  return (
    <Glass space="admin" className="mb-6 flex gap-3 p-4">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="space-y-2 text-body">
        <p className="text-text-secondary">
          <span className="font-medium text-text-primary">What this is: </span>
          {purpose}
        </p>
        <p className="text-text-secondary">
          <span className="font-medium text-text-primary">When to use it: </span>
          {whenToUse}
        </p>
      </div>
    </Glass>
  );
}
