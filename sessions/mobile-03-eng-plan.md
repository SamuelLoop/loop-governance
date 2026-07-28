# Loop Governance Mobile: engineering plan review — 2026-07-28

## Run first

Read `sessions/mobile-frontend-design-output.md` (output from session 2).
Then invoke `/plan-eng-review` with the context below.

---

## Context

Engineering plan for a React Native (Expo) mobile app that shares the existing
Supabase backend at the Loop Governance platform.

**Existing backend (do not change):**
- Supabase Postgres with tables: `users`, `delegations`, `accreditations`,
  `accreditation_scores`, `communities`, `community_memberships`, `votes`,
  `proposals`, `earnings`
- Supabase Auth (email + magic link)
- Supabase Realtime (WebSocket push for chat and delegation events)
- REST API via PostgREST (Supabase client)
- No separate mobile API layer exists yet

**Proposed tech stack (review and challenge if wrong):**
- Expo SDK (latest stable) with EAS Build for iOS + Android
- Expo Router (file-based navigation, same paradigm as Next.js App Router)
- `@supabase/supabase-js` v2 — the same client library used on web
- React Native Reanimated for gesture-driven animations (swipe to revoke
  delegation, etc.)
- React Native Gesture Handler for swipe and long-press interactions
- Zustand for local state (auth session, active subject, unread counts)
- `@shopify/flash-list` for the chat feed (replaces FlatList; virtualises
  large message lists efficiently)
- `react-native-svg` to render the power tree SVG (the SVG generator from
  `apps/portal/src/lib/power-tree.ts` can be reused as a pure TS function)
- Expo Notifications for push (delegation received, new leadership message)
- Expo SecureStore for auth token persistence

**New repo location:** `apps/mobile` inside the existing Turborepo monorepo at
`/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-governance/apps/mobile`

**Shared code opportunity:**
`apps/portal/src/lib/power-tree.ts` exports `generateTreeSVG()` as pure
TypeScript with no DOM or Node.js dependencies. This function can be imported
directly in the mobile app to generate the SVG string that `react-native-svg`
renders. This should be moved to `packages/ui` (currently empty) so both
portal, console, and mobile can import it.

---

## What the plan review should cover

1. **Stack validation** — confirm or replace each proposed dependency with a
   reasoned alternative if better; flag any dependency that will cause pain on
   both iOS and Android (e.g. native modules that break Expo Go)

2. **Supabase Realtime in React Native** — `@supabase/supabase-js` v2 uses
   WebSockets which work in React Native, but there are known issues with
   background/foreground lifecycle. Plan the subscription management:
   when to subscribe, when to unsubscribe, how to handle reconnect on app
   foregrounding

3. **Chat architecture** — the chat feed needs:
   - Initial load: fetch last N messages from Supabase
   - Live updates: Supabase Realtime channel per community+subject
   - Offline/poor signal: optimistic local insert with server confirmation
   Plan the data layer for this (Zustand store shape, subscription lifecycle)

4. **Power tree in React Native** — `react-native-svg` can render SVG strings
   but the existing `generateTreeSVG()` returns a raw SVG string which needs
   to be parsed or converted. Evaluate: (a) parse the SVG string with
   `react-native-svg`'s `SvgXml` component, or (b) refactor `generateTreeSVG()`
   to return a React Native SVG component tree. Option (a) is lower effort;
   option (b) is safer. Recommend with reasoning.

5. **Auth flow** — Supabase magic link auth requires a redirect URL. In React
   Native this means deep links. Plan the Expo deep link config for
   `loopcmbntr://auth/callback` and the Supabase redirect URL allow-list update.

6. **Monorepo integration** — how `apps/mobile` fits into the Turborepo
   pipeline: dev server, build, type-check. Expo uses Metro bundler not Webpack,
   which requires Turbo task config adjustments.

7. **Push notifications** — Expo Notifications + Supabase Edge Function to fan
   out push when a delegation is received or a leadership message is posted in
   a community the user is active in. Sketch the architecture.

8. **Risk register** — top 5 technical risks with mitigation.

Save the approved plan to: `sessions/mobile-eng-plan-output.md`
