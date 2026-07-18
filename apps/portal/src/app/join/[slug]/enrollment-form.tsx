"use client";

import { useActionState } from "react";
import { submitEnrollment, type EnrollmentState } from "./actions";

const SUBJECT_TAGS = [
  "Governance",
  "Economics",
  "Ecology",
  "Education",
  "Health",
  "Technology",
  "Agriculture",
  "Energy",
  "Housing",
  "Arts & Culture",
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i + 1 === current
              ? "w-8 bg-amber-500"
              : i + 1 < current
                ? "w-4 bg-amber-500/40"
                : "w-4 bg-neutral-700"
          }`}
        />
      ))}
    </div>
  );
}

function StepDetails({
  communityId,
  communityName,
}: {
  communityId: string;
  communityName: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-xl font-medium text-neutral-100">
          Join {communityName}
        </h2>
        <p className="text-sm text-neutral-400">
          Tell us about yourself to get started.
        </p>
      </div>

      <input type="hidden" name="step" value="1" />
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="communityName" value={communityName} />

      <div>
        <label
          htmlFor="displayName"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
        >
          Full name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
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
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="location"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
        >
          Location
          <span className="ml-1 text-neutral-600">(optional)</span>
        </label>
        <input
          id="location"
          name="location"
          type="text"
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
          placeholder="City, Country"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-amber-600 px-4 py-2.5 font-medium text-white transition hover:bg-amber-500 focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-neutral-900"
      >
        Continue
      </button>
    </div>
  );
}

function StepInterests({
  communityId,
  communityName,
  authId,
}: {
  communityId: string;
  communityName: string;
  authId: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-xl font-medium text-neutral-100">
          Your interests
        </h2>
        <p className="text-sm text-neutral-400">
          Select the subjects you care about. This helps us connect you with the
          right communities and conversations.
        </p>
      </div>

      <input type="hidden" name="step" value="2" />
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="communityName" value={communityName} />
      <input type="hidden" name="authId" value={authId} />

      <div className="grid grid-cols-2 gap-2">
        {SUBJECT_TAGS.map((tag) => (
          <label
            key={tag}
            className="flex cursor-pointer items-center gap-2.5 rounded-md border border-neutral-700 bg-neutral-800/30 px-3 py-2.5 text-sm text-neutral-300 transition has-[:checked]:border-amber-500/50 has-[:checked]:bg-amber-500/10 has-[:checked]:text-amber-400 hover:border-neutral-600"
          >
            <input
              type="checkbox"
              name="interests"
              value={tag.toLowerCase()}
              className="sr-only"
            />
            <span>{tag}</span>
          </label>
        ))}
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-amber-600 px-4 py-2.5 font-medium text-white transition hover:bg-amber-500 focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-neutral-900"
      >
        Continue
      </button>
    </div>
  );
}

function StepConfirm({
  communityId,
  communityName,
  authId,
}: {
  communityId: string;
  communityName: string;
  authId: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-xl font-medium text-neutral-100">
          Confirm membership
        </h2>
        <p className="text-sm text-neutral-400">
          By joining {communityName}, you become part of a governance community.
          You can participate in discussions, accredit peers, vote on proposals,
          and trade within the community.
        </p>
      </div>

      <input type="hidden" name="step" value="3" />
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="communityName" value={communityName} />
      <input type="hidden" name="authId" value={authId} />

      <div className="rounded-md border border-neutral-700 bg-neutral-800/30 p-4 text-sm text-neutral-400">
        <p className="mb-3 font-medium text-neutral-200">
          As a member you can:
        </p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-500">&#9656;</span>
            Accredit peers for their knowledge and expertise
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-500">&#9656;</span>
            Vote on community proposals and fund allocations
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-500">&#9656;</span>
            Post trade listings (buy/sell commodities and services)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-500">&#9656;</span>
            Receive community communications and updates
          </li>
        </ul>
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-amber-600 px-4 py-2.5 font-medium text-white transition hover:bg-amber-500 focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-neutral-900"
      >
        Join {communityName}
      </button>
    </div>
  );
}

function StepSuccess({ communityName }: { communityName: string }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-3xl text-amber-500">
        &#10003;
      </div>
      <div>
        <h2 className="mb-1 text-xl font-medium text-neutral-100">
          Welcome to {communityName}
        </h2>
        <p className="text-sm text-neutral-400">
          You are now a member. Check your email to verify your account, then
          visit the governance console to start participating.
        </p>
      </div>
      <a
        href="/"
        className="inline-block rounded-md border border-neutral-700 px-6 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
      >
        Return home
      </a>
    </div>
  );
}

export function EnrollmentForm({
  communityId,
  communityName,
}: {
  communityId: string;
  communityName: string;
}) {
  const initialState: EnrollmentState = {
    step: 1,
    communityId,
    communityName,
  };
  const [state, formAction] = useActionState(submitEnrollment, initialState);

  const totalSteps = 4;

  return (
    <div className="mx-auto w-full max-w-md">
      <StepIndicator current={state.step} total={totalSteps} />

      {state.error && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <form action={formAction}>
        {state.step === 1 && (
          <StepDetails communityId={communityId} communityName={communityName} />
        )}
        {state.step === 2 && (
          <StepInterests
            communityId={state.communityId!}
            communityName={state.communityName!}
            authId={state.authId!}
          />
        )}
        {state.step === 3 && (
          <StepConfirm
            communityId={state.communityId!}
            communityName={state.communityName!}
            authId={state.authId!}
          />
        )}
        {state.step === 4 && (
          <StepSuccess communityName={state.communityName!} />
        )}
      </form>
    </div>
  );
}
