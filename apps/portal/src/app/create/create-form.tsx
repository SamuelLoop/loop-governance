"use client";

import { useActionState, useState } from "react";
import {
  checkSimilarity,
  createCommunity,
  type CreateState,
  type SimilarCommunity,
} from "./actions";
import { type SubjectConfig } from "@/lib/subjects";
import { ConversionCard } from "@loop/ui";

const LEVELS = [
  { value: "local", label: "Local", desc: "Neighbourhood or district" },
  { value: "city", label: "City", desc: "A single city or metro area" },
  { value: "national", label: "National", desc: "Covers a whole country" },
  { value: "continental", label: "Continental", desc: "Spans a continent" },
  { value: "global", label: "Global", desc: "Worldwide scope" },
];

function SimilarResults({
  similar,
  formData,
  onProceed,
}: {
  similar: SimilarCommunity[];
  formData: CreateState["formData"];
  onProceed: () => void;
}) {
  const SUBJECT_LABELS: Record<string, string> = {
    governance: "Governance",
    economics: "Economics",
    ecology: "Ecology",
    health: "Health",
    technology: "Technology",
    education: "Education",
    culture: "Arts & Culture",
    agriculture: "Agriculture",
    energy: "Energy",
    housing: "Housing",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-xl font-medium text-text-primary">
          Similar communities exist
        </h2>
        <p className="text-sm text-text-secondary">
          We found communities that might cover the same ground as
          &ldquo;{formData?.name}&rdquo;. Consider joining one instead of
          creating a duplicate.
        </p>
      </div>

      <div className="space-y-3">
        {similar.map((c) => (
          <a
            key={c.id}
            href={`/join/${c.subject}`}
            className="block rounded-lg border border-surface-border bg-background/50 p-4 transition-colors hover:border-text-secondary/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {c.name}
                </p>
                {c.description && (
                  <p className="mt-1 text-xs text-text-secondary">
                    {c.description.length > 120
                      ? c.description.slice(0, 120) + "..."
                      : c.description}
                  </p>
                )}
              </div>
              <div className="ml-4 text-right text-xs text-text-secondary">
                <p>{SUBJECT_LABELS[c.subject] ?? c.subject}</p>
                <p>
                  {c.memberCount} member{c.memberCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="border-t border-surface-border pt-4">
        <p className="mb-3 text-xs text-text-secondary">
          None of these match what you have in mind?
        </p>
        <button
          type="button"
          onClick={onProceed}
          className="rounded-lg border border-surface-border px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-text-secondary/50 hover:text-text-primary"
        >
          Create it anyway
        </button>
      </div>
    </div>
  );
}

function AuthStep({
  formData,
  error,
}: {
  formData: CreateState["formData"];
  error?: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-xl font-medium text-text-primary">
          Almost there
        </h2>
        <p className="text-sm text-text-secondary">
          Tell us who you are. You will be the first admin of
          &ldquo;{formData?.name}&rdquo;.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-error/30 bg-error/10 px-4 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      <input type="hidden" name="name" value={formData?.name} />
      <input type="hidden" name="description" value={formData?.description} />
      <input type="hidden" name="subject" value={formData?.subject} />
      <input type="hidden" name="visibility" value={formData?.visibility} />
      <input type="hidden" name="level" value={formData?.level} />

      <div>
        <label
          htmlFor="displayName"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary"
        >
          Your name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          className="w-full rounded-md border border-surface-border bg-background px-4 py-2.5 text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary/50"
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-surface-border bg-background px-4 py-2.5 text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary/50"
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-md px-4 py-2.5 font-medium text-white shadow-[var(--accent-glow)] transition-opacity hover:opacity-90"
        style={{ background: "var(--accent-gradient)" }}
      >
        Create community
      </button>
    </div>
  );
}

function SuccessStep({ communityName }: { communityName: string }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-3xl text-success">
        &#10003;
      </div>
      <div>
        <h2 className="mb-1 text-xl font-medium text-text-primary">
          {communityName} is live
        </h2>
        <p className="text-sm text-text-secondary">
          You are the founding admin. Share the link to start building your
          community.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <a
          href="https://console.loopcmbntr.live"
          className="inline-block rounded-md px-6 py-2.5 text-sm font-medium text-white shadow-[var(--accent-glow)] transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-gradient)" }}
        >
          Go to Console
        </a>
        <a
          href="/"
          className="inline-block rounded-md border border-surface-border px-6 py-2.5 text-sm text-text-secondary transition-colors hover:border-text-secondary/50 hover:text-text-primary"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}

export function CreateForm({ subjects }: { subjects: SubjectConfig[] }) {
  const initialState: CreateState = { step: "form" };
  const [simState, simAction] = useActionState(checkSimilarity, initialState);
  const [createState, createAction] = useActionState(
    createCommunity,
    initialState
  );
  const [proceedPastSimilar, setProceedPastSimilar] = useState(false);

  const activeState =
    createState.step === "success" ? createState : simState;
  const effectiveStep = proceedPastSimilar
    ? "auth"
    : createState.step === "success"
      ? "success"
      : createState.error
        ? "auth"
        : activeState.step;

  const formData = activeState.formData ?? createState.formData;

  return (
    <div className="mx-auto w-full max-w-lg">
      <ConversionCard>
        {effectiveStep === "form" && (
          <form action={simAction}>
            <div className="space-y-5">
              <div>
                <h2 className="mb-1 text-xl font-medium text-text-primary">
                  Create a community
                </h2>
                <p className="text-sm text-text-secondary">
                  Any subject imaginable. Woodworking, ocean conservation, local
                  business, philosophy. If it matters to people, it belongs here.
                </p>
              </div>

              {activeState.error && (
                <div className="rounded-md border border-error/30 bg-error/10 px-4 py-2.5 text-sm text-error">
                  {activeState.error}
                </div>
              )}

              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Community name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="w-full rounded-md border border-surface-border bg-background px-4 py-2.5 text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary/50"
                  placeholder='e.g. "Save the Whales" or "Woodworking Masters"'
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  className="w-full rounded-md border border-surface-border bg-background px-4 py-2.5 text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary/50"
                  placeholder="What is this community about? What will members do together?"
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Primary subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  required
                  className="w-full rounded-md border border-surface-border bg-background px-4 py-2.5 text-text-primary outline-none transition-colors focus:border-primary/50"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                  <option value="other">Other</option>
                </select>
                <p className="mt-1 text-[11px] text-text-muted">
                  This places your community in the right governance tree.
                </p>
              </div>

              <div>
                <label
                  htmlFor="level"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  Scope
                </label>
                <div className="space-y-2">
                  {LEVELS.map((l) => (
                    <label
                      key={l.value}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-surface-border bg-background/50 px-4 py-3 transition-colors hover:border-text-secondary/40"
                    >
                      <input
                        type="radio"
                        name="level"
                        value={l.value}
                        required
                        className="accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {l.label}
                        </p>
                        <p className="text-xs text-text-secondary">{l.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex cursor-pointer flex-col rounded-md border border-surface-border bg-background/50 p-4 transition-colors hover:border-text-secondary/40 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        defaultChecked
                        className="accent-primary"
                      />
                      <span className="text-sm font-medium text-text-primary">
                        Public
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Anyone can join. Listed on the portal.
                    </p>
                  </label>
                  <label className="flex cursor-pointer flex-col rounded-md border border-surface-border bg-background/50 p-4 transition-colors hover:border-text-secondary/40 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        className="accent-primary"
                      />
                      <span className="text-sm font-medium text-text-primary">
                        Private
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Invite only. Not listed publicly.
                    </p>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-md px-4 py-2.5 font-medium text-white shadow-[var(--accent-glow)] transition-opacity hover:opacity-90"
                style={{ background: "var(--accent-gradient)" }}
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {effectiveStep === "similar" && activeState.similar && (
          <SimilarResults
            similar={activeState.similar}
            formData={formData}
            onProceed={() => setProceedPastSimilar(true)}
          />
        )}

        {effectiveStep === "auth" && (
          <form action={createAction}>
            <AuthStep formData={formData} error={createState.error} />
          </form>
        )}

        {effectiveStep === "success" && (
          <SuccessStep
            communityName={createState.communityName ?? "Your community"}
          />
        )}
      </ConversionCard>
    </div>
  );
}
