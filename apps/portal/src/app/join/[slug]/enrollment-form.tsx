"use client";

import { useActionState } from "react";
import { submitEnrollment, type EnrollmentState } from "./actions";
import type { SubjectConfig } from "@/lib/subjects";

const COUNTRIES = [
  "Argentina", "Australia", "Austria", "Bangladesh", "Belgium", "Brazil",
  "Cambodia", "Cameroon", "Canada", "Chile", "China", "Colombia",
  "Croatia", "Czech Republic", "Denmark", "Egypt", "Ethiopia",
  "Finland", "France", "Germany", "Ghana", "Greece", "Hong Kong",
  "Hungary", "India", "Indonesia", "Ireland", "Israel", "Italy",
  "Japan", "Kenya", "Malaysia", "Mexico", "Morocco", "Netherlands",
  "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines",
  "Poland", "Portugal", "Romania", "Russia", "Rwanda", "Saudi Arabia",
  "Senegal", "Singapore", "South Africa", "South Korea", "Spain",
  "Sweden", "Switzerland", "Taiwan", "Tanzania", "Thailand", "Turkey",
  "UAE", "Uganda", "UK", "Ukraine", "USA", "Venezuela", "Vietnam",
];

const ISO_TO_COUNTRY: Record<string, string> = {
  AR: "Argentina", AU: "Australia", AT: "Austria", BD: "Bangladesh",
  BE: "Belgium", BR: "Brazil", KH: "Cambodia", CM: "Cameroon",
  CA: "Canada", CL: "Chile", CN: "China", CO: "Colombia",
  HR: "Croatia", CZ: "Czech Republic", DK: "Denmark", EG: "Egypt",
  ET: "Ethiopia", FI: "Finland", FR: "France", DE: "Germany",
  GH: "Ghana", GR: "Greece", HK: "Hong Kong", HU: "Hungary",
  IN: "India", ID: "Indonesia", IE: "Ireland", IL: "Israel",
  IT: "Italy", JP: "Japan", KE: "Kenya", MY: "Malaysia",
  MX: "Mexico", MA: "Morocco", NL: "Netherlands", NZ: "New Zealand",
  NG: "Nigeria", NO: "Norway", PK: "Pakistan", PE: "Peru",
  PH: "Philippines", PL: "Poland", PT: "Portugal", RO: "Romania",
  RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia", SN: "Senegal",
  SG: "Singapore", ZA: "South Africa", KR: "South Korea", ES: "Spain",
  SE: "Sweden", CH: "Switzerland", TW: "Taiwan", TZ: "Tanzania",
  TH: "Thailand", TR: "Turkey", AE: "UAE", UG: "Uganda",
  GB: "UK", UA: "Ukraine", US: "USA", VE: "Venezuela", VN: "Vietnam",
};

function StepIndicator({
  current,
  total,
  accent,
}: {
  current: number;
  total: number;
  accent: string;
}) {
  return (
    <div className="mb-10 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i + 1 === current ? 32 : 16,
            backgroundColor:
              i + 1 <= current ? accent : "rgb(64 64 64)",
            opacity: i + 1 < current ? 0.4 : 1,
          }}
        />
      ))}
    </div>
  );
}

function StepDetails({
  subject,
  defaultCity,
  defaultCountry,
}: {
  subject: SubjectConfig;
  defaultCity: string;
  defaultCountry: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-xl font-medium text-neutral-100">
          Join {subject.name}
        </h2>
        <p className="text-sm text-neutral-400">
          Tell us about yourself. Your location determines which
          geographic communities you join within {subject.name}.
        </p>
      </div>

      <input type="hidden" name="step" value="1" />
      <input type="hidden" name="subject" value={subject.slug} />

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
          autoComplete="name"
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-neutral-500"
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
          autoComplete="email"
          className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-neutral-500"
          placeholder="you@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="city"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
          >
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            autoComplete="address-level2"
            defaultValue={defaultCity}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-neutral-500"
            placeholder="e.g. Cape Town"
          />
        </div>
        <div>
          <label
            htmlFor="country"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
          >
            Country
          </label>
          <select
            id="country"
            name="country"
            required
            defaultValue={defaultCountry}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-neutral-100 outline-none transition focus:border-neutral-500"
          >
            <option value="" disabled className="text-neutral-500">
              Select country
            </option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c} className="bg-neutral-800">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="!mt-1 text-[11px] text-neutral-600">
        This places you in your local, national, continental, and global
        communities for {subject.name}.
      </p>

      <button
        type="submit"
        className="w-full rounded-md px-4 py-2.5 font-medium text-white transition hover:brightness-110"
        style={{ backgroundColor: subject.accent }}
      >
        Continue
      </button>
    </div>
  );
}

function StepConfirm({
  subject,
  authId,
}: {
  subject: SubjectConfig;
  authId: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-xl font-medium text-neutral-100">
          Confirm membership
        </h2>
        <p className="text-sm text-neutral-400">
          You will be placed into all geographic communities for{" "}
          {subject.name} that contain your location, from local up to
          global.
        </p>
      </div>

      <input type="hidden" name="step" value="2" />
      <input type="hidden" name="subject" value={subject.slug} />
      <input type="hidden" name="authId" value={authId} />

      <div className="rounded-md border border-neutral-700 bg-neutral-800/30 p-4 text-sm text-neutral-400">
        <p className="mb-3 font-medium text-neutral-200">
          As a {subject.name} member you can:
        </p>
        <ul className="space-y-1.5">
          {subject.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-0.5" style={{ color: subject.accent }}>
                &#9656;
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="submit"
        className="w-full rounded-md px-4 py-2.5 font-medium text-white transition hover:brightness-110"
        style={{ backgroundColor: subject.accent }}
      >
        Join {subject.name}
      </button>
    </div>
  );
}

function StepSuccess({
  subject,
  communities,
}: {
  subject: SubjectConfig;
  communities: string[];
}) {
  return (
    <div className="space-y-5 text-center">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl"
        style={{ backgroundColor: `${subject.accent}15`, color: subject.accent }}
      >
        &#10003;
      </div>
      <div>
        <h2 className="mb-1 text-xl font-medium text-neutral-100">
          Welcome to {subject.name}
        </h2>
        <p className="text-sm text-neutral-400">
          You have been placed in {communities.length} communit
          {communities.length === 1 ? "y" : "ies"}:
        </p>
      </div>
      <div className="space-y-1">
        {communities.map((name) => (
          <div
            key={name}
            className="rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-300"
          >
            {name}
          </div>
        ))}
      </div>
      <a
        href="https://console.loopcmbntr.live"
        className="inline-block rounded-md px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
        style={{ backgroundColor: subject.accent }}
      >
        Go to Console
      </a>
      <a
        href="/"
        className="inline-block rounded-md border border-neutral-700 px-6 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
      >
        Join another subject
      </a>
    </div>
  );
}

export function EnrollmentForm({
  subject,
  geoCity,
  geoCountryCode,
}: {
  subject: SubjectConfig;
  geoCity?: string;
  geoCountryCode?: string;
}) {
  const initialState: EnrollmentState = {
    step: 1,
    subject: subject.slug,
  };
  const [state, formAction] = useActionState(submitEnrollment, initialState);

  const totalSteps = 3;
  const defaultCountry = geoCountryCode
    ? ISO_TO_COUNTRY[geoCountryCode] ?? ""
    : "";

  return (
    <div className="mx-auto w-full max-w-md">
      <StepIndicator
        current={state.step}
        total={totalSteps}
        accent={subject.accent}
      />

      {state.error && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <form action={formAction}>
        {state.step === 1 && (
          <StepDetails
            subject={subject}
            defaultCity={geoCity ?? ""}
            defaultCountry={defaultCountry}
          />
        )}
        {state.step === 2 && (
          <StepConfirm subject={subject} authId={state.authId!} />
        )}
        {state.step === 3 && (
          <StepSuccess
            subject={subject}
            communities={state.communities ?? []}
          />
        )}
      </form>
    </div>
  );
}
