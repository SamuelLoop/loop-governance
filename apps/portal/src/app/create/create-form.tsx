"use client";

import { useActionState, useState } from "react";
import {
  checkSimilarity,
  createCommunity,
  type CreateState,
  type SimilarCommunity,
} from "./actions";
import { type SubjectConfig } from "@/lib/subjects";

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
        <h2 className="mb-1 text-xl font-medium text-neutral-100">
          Similar communities exist
        </h2>
        <p className="text-sm text-neutral-400">
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
            className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  {c.name}
                </p>
                {c.description && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {c.description.length > 120
                      ? c.description.slice(0, 120) + "..."
                      : c.description}
                  </p>
                )}
              </div>
              <div className="ml-4 text-right text-xs text-neutral-500">
                <p>{SUBJECT_LABELS[c.subject] ?? c.subject}</p>
                <p>
                  {c.memberCount} member{c.memberCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="border-t border-neutral-800 pt-4">
        <p className="mb-3 text-xs text-neutral-500">
          None of these match what you have in mind?
        </p>
        <button
          type="button"
          onClick={onProceed}
          className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
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
        <h2 className="mb-1 text-xl font-medium text-neutral-100">
          Almost there
        </h2>
        <p className="text-sm text-neutral-400">
          Tell us who you are. You will be the first admin of
          &ldquo;{formData?.name}&rdquo;.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
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
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
        >
          Your name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50"
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50"
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-amber-500 px-4 py-2.5 font-medium text-neutral-950 transition hover:bg-amber-400"
      >
        Create community
      </button>
    </div>
  );
}

function SuccessStep({ communityName }: { communityName: string }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-3xl text-amber-400">
        &#10003;
      </div>
      <div>
        <h2 className="mb-1 text-xl font-medium text-neutral-100">
          {communityName} is live
        </h2>
        <p className="text-sm text-neutral-400">
          You are the founding admin. Share the link to start building your
          community.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <a
          href="https://console.loopcmbntr.live"
          className="inline-block rounded-md bg-amber-500 px-6 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-amber-400"
        >
          Go to Console
        </a>
        <a
          href="/"
          className="inline-block rounded-md border border-neutral-700 px-6 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
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
      {effectiveStep === "form" && (
        <form action={simAction}>
          <div className="space-y-5">
            <div>
              <h2 className="mb-1 text-xl font-medium text-neutral-100">
                Create a community
              </h2>
              <p className="text-sm text-neutral-400">
                Any subject imaginable. Woodworking, ocean conservation, local
                business, philosophy. If it matters to people, it belongs here.
              </p>
            </div>

            {activeState.error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {activeState.error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
              >
                Community name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50"
                placeholder='e.g. "Save the Whales" or "Woodworking Masters"'
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50"
                placeholder="What is this community about? What will members do together?"
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
              >
                Primary subject
              </label>
              <select
                id="subject"
                name="subject"
                required
                className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 outline-none transition focus:border-amber-500/50"
              >
                <option value="">Select a subject</option>
                {subjects.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.icon} {s.name}
                  </option>
                ))}
                <option value="other">Other</option>
              </select>
              <p className="mt-1 text-[11px] text-neutral-600">
                This places your community in the right governance tree.
              </p>
            </div>

            <div>
              <label
                htmlFor="level"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
              >
                Scope
              </label>
              <div className="space-y-2">
                {LEVELS.map((l) => (
                  <label
                    key={l.value}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900/30 px-4 py-3 transition hover:border-neutral-700"
                  >
                    <input
                      type="radio"
                      name="level"
                      value={l.value}
                      required
                      className="accent-amber-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-200">
                        {l.label}
                      </p>
                      <p className="text-xs text-neutral-500">{l.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400">
                Visibility
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer flex-col rounded-md border border-neutral-800 bg-neutral-900/30 p-4 transition hover:border-neutral-700 has-[:checked]:border-amber-500/40 has-[:checked]:bg-amber-500/5">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      defaultChecked
                      className="accent-amber-500"
                    />
                    <span className="text-sm font-medium text-neutral-200">
                      Public
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Anyone can join. Listed on the portal.
                  </p>
                </label>
                <label className="flex cursor-pointer flex-col rounded-md border border-neutral-800 bg-neutral-900/30 p-4 transition hover:border-neutral-700 has-[:checked]:border-amber-500/40 has-[:checked]:bg-amber-500/5">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      className="accent-amber-500"
                    />
                    <span className="text-sm font-medium text-neutral-200">
                      Private
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Invite only. Not listed publicly.
                  </p>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-amber-500 px-4 py-2.5 font-medium text-neutral-950 transition hover:bg-amber-400"
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
    </div>
  );
}
