# Loop Governance Mobile: developer experience review — 2026-07-28

## Run first

Read `sessions/mobile-eng-plan-output.md` (output from session 3).
Then invoke `/plan-devex-review` with the context below.

---

## Context

The approved engineering plan is in `sessions/mobile-eng-plan-output.md`.
This session reviews the developer experience of building and maintaining
the `apps/mobile` Expo app inside the Loop Governance Turborepo.

The goal is that a single developer (Samuel) can build, test, and ship the app
without friction. Every step that requires manual intervention or tribal
knowledge is a step that will be skipped when there is deadline pressure.

---

## What to review

### 1. Local development loop

- Starting the Expo dev server alongside `apps/portal` and `apps/console`
  dev servers from the repo root with a single command
- Turbo task definition for `mobile#dev` — Expo uses Metro, not Next.js dev;
  the Turbo persistent task config needs adjustment
- Environment variable handling: Expo uses `app.config.js` + `EXPO_PUBLIC_`
  prefix for client-side vars (equivalent to `NEXT_PUBLIC_` in Next.js);
  review the mapping from existing `.env.local` to Expo env config

### 2. Simulator and device testing

- iOS Simulator setup via `expo run:ios` — confirm the repo's existing
  `mcp__Claude_Code_iOS_Simulator__control` tool (available in Claude Code
  sessions) can attach to the Expo-built app for automated visual verification
- Android Emulator setup with Android Studio
- Expo Go for rapid iteration (before native modules require a dev build)
- EAS Build for TestFlight (iOS) and Google Play Internal Testing (Android)

### 3. CI/CD pipeline

- GitHub Actions workflow for:
  - `pnpm type-check` and `pnpm lint` on every PR (fast, no Expo build)
  - EAS Build triggered on merge to `main` (iOS simulator build for automated
    test, not full store submission)
  - Notification to Samuel when build is ready on TestFlight
- EAS secrets management: `EXPO_TOKEN`, `APPLE_ID`, `ASC_APP_ID` stored as
  GitHub Actions secrets; these are separate from Vercel env vars

### 4. OTA updates

- Expo Updates (`expo-updates`) for JS-only changes (no native code change)
  — allows shipping chat UI fixes and power tree tweaks without an App Store
  review
- Branch strategy: `production` channel for App Store, `preview` channel for
  TestFlight
- Review what changes require a full native build (adding a new Expo native
  module, changing `app.config.js` `ios.bundleIdentifier`, etc.)

### 5. Shared code from monorepo

- `packages/ui` is currently empty; the plan is to move `generateTreeSVG()`
  there so portal, console, and mobile share it
- Review TypeScript path aliases: `@loop/ui` should resolve correctly in Metro
  (Metro does not read `tsconfig.json` paths natively; needs
  `babel-plugin-module-resolver` or `metro.config.js` aliases)
- Review whether `packages/db` (Drizzle schema) is useful in the mobile app
  or whether the mobile app uses only the Supabase JS client

### 6. Testing setup

- Vitest for unit tests (pure TS functions: power tree generator, tier
  calculation, score formula)
- React Native Testing Library for component tests
- Detox or Maestro for end-to-end flows (chat message send, delegation tap)
  — recommend one with reasoning; Maestro is simpler to set up
- Minimum test coverage for launch: chat send, delegation submit, accreditation
  submit — these are the only three flows that must not regress

### 7. App Store requirements checklist

- iOS: privacy manifest (`PrivacyInfo.xcprivacy`) required for apps using
  certain APIs — flag which Expo modules trigger this requirement
- Android: `targetSdkVersion` must be current year's requirement
- Both: push notification entitlements, deep link URL scheme registration
- Privacy policy URL (`loopcmbntr.live/privacy` exists in the portal)

---

## Deliverable

A `sessions/mobile-devex-checklist.md` file with:
- Every setup step numbered and actionable (not "configure CI" — "add
  `.github/workflows/mobile-ci.yml` with this content")
- A launch-readiness checklist: the minimum bar to ship v1 to TestFlight
- A post-launch checklist: what to add after the first real users are on it
