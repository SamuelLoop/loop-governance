"use client";

import { useTransition } from "react";
import { setSubject } from "./set-subject";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUBJECT_LABELS: Record<string, string> = {
  governance: "Governance",
  economics: "Economics",
  ecology: "Ecology",
  health: "Health",
  technology: "Technology",
  education: "Education",
  culture: "Culture",
  infrastructure: "Infrastructure",
  justice: "Justice",
  energy: "Energy",
};

export function SubjectSwitcher({
  subjects,
  active,
}: {
  subjects: string[];
  active: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    startTransition(() => {
      setSubject(value);
    });
  }

  return (
    <div className="px-2 pb-2">
      <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Subject
      </p>
      <Select value={active} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-xs" disabled={isPending}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((s) => (
            <SelectItem key={s} value={s}>
              {SUBJECT_LABELS[s] ?? s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
