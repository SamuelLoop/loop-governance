# Loop Governance Mobile — Engineering Plan Output
**Date:** 2026-07-28
**Session:** mobile-03-eng-plan
**Reviewed by:** /plan-eng-review
**Follows:** mobile-02-frontend-design (DESIGN.mobile.md)
**Next session:** mobile-04-implementation.md

---

## 0. Prerequisites (do first, before writing a single line of app code)

1. **Dev build required** — Expo Go cannot run `react-native-svg`, Reanimated 3, or Gesture Handler. Run `npx expo run:ios` or `eas build --profile development` before any native-module testing. This is the daily driver, not Expo Go.
2. **EAS configuration** — create `apps/mobile/eas.json` with three build profiles before any CI build:
   - `development`: dev client, `distribution: "internal"`
   - `preview`: TestFlight / internal track
   - `production`: App Store / Play Store
   Inject env vars via EAS secrets: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   Set `"appDir": "."` inside `apps/mobile/eas.json` (monorepo path).
3. **Supabase redirect allow-list** — add `loopgov://auth/callback` to the Supabase project's Auth > URL Configuration > Redirect URLs before testing magic link.

---

## 1. Tech Stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Expo SDK (latest stable) + EAS Build | iOS + Android |
| Navigation | Expo Router (file-based) | Same paradigm as Next.js App Router |
| Supabase client | `@supabase/supabase-js` v2 | Anon key only — no service role in mobile |
| Animations | **Reanimated 3 everywhere** | All animations (shimmer, gestures, power bar, bottom sheet) on the UI thread. No Animated API. |
| Gestures | React Native Gesture Handler | Nested conflicts require explicit `simultaneousHandlers` / `waitFor` config — see §7 |
| Lists | `@shopify/flash-list` **v2** | v2 eliminates `estimatedItemSize`; required for variable-height chat messages |
| State | Zustand (3 slices — see §4) | |
| SVG | `react-native-svg` | For `<PowerTreeMini>` and `<Sparkline>` components |
| Auth persistence | Expo SecureStore | |
| URL scheme | `loopgov://` | Dedicated scheme; `expo.scheme = 'loopgov'` in app.config.ts |
| Push notifications | **DEFERRED to v1.1** | See TODOS |

**NOT in scope (v1):**
- Push notifications (EAS credentials, Edge Function fan-out, permission UX — all deferred)
- Android App Links / iOS Universal Links (deferred until App Store submission — see TODOS)
- Offline-first persistence (SQLite/MMKV) — optimistic inserts are in-memory only
- Tablet layout
- Web build target

---

## 2. Monorepo Integration

### packages/ui setup (first implementation task)
`packages/ui` is currently empty. Wire it up before any app imports it:

```
packages/ui/
  package.json        { "name": "@loop/ui", "main": "./src/index.ts", "types": "./src/index.ts" }
  tsconfig.json       extends ../../tsconfig.json, includes ./src
  src/
    index.ts          barrel export
    power-tree/
      types.ts        TreeNode, TreeData, TreeSVGOptions (imported from apps/portal, not regenerated)
      layout.ts       placeNodes() — pure layout algorithm
```

**`generateTreeSVG` stays in `apps/portal/src/lib/power-tree.ts`** — it generates the full 500×582 web badge with gradients, text overlays, and stats. It is not suitable for mobile rendering.

### Metro monorepo config
`apps/mobile/metro.config.js` must explicitly configure the monorepo root:

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
module.exports = config;
```

Without this, `import { placeNodes } from '@loop/ui'` fails at Metro bundle time (pnpm symlinks are not followed by default).

### Turborepo
Add to `turbo.json` tasks:
```json
"type-check": {
  "dependsOn": ["^build"]
}
```
`apps/mobile` participates in `type-check` only. Dev is started separately:
```bash
cd apps/mobile && expo start
```
EAS builds via `eas build` — not through Turbo.

---

## 3. Auth Flow

```
User taps "Send magic link"
         │
         ▼
Supabase sends email → loopgov://auth/callback?token=...
         │
         ▼ (iOS: system modal "Open in Loop Governance?" — acceptable pre-App Store)
app/auth/callback.tsx (Expo Router)
         │
         ├─ exchange token → Supabase session
         ├─ store session in SecureStore via supabase-js AsyncStorage adapter
         └─ navigate to /(tabs)/chat
```

Config:
- `expo.scheme = 'loopgov'` in `app.config.ts`
- Supabase `redirectTo`: `Linking.createURL('/auth/callback')`
- Supabase allow-list: `loopgov://auth/callback`

**App Store upgrade path (TODOS):** Add Associated Domains entitlement + AASA file at `loopgov.loopcmbntr.live` before App Store submission. Universal Links replace the custom scheme on iOS — no user-facing modal.

---

## 4. Zustand Store Shape

Three slices. Define before any component touches state.

```ts
// authStore
{
  session: Session | null
  user: { id: string; displayName: string; tier: Tier; powerScore: number } | null
  setSession(s: Session | null): void
  setUser(u: User): void
}

// subjectStore
{
  activeSubjects: string[]           // user's pinned subjects (max 5)
  activeSubject: string              // currently selected subject tag
  tierDistribution: Record<string, TierCounts>  // per subject
  setActiveSubject(tag: string): void
  setTierDistribution(tag: string, counts: TierCounts): void
}

// chatStore (most complex)
{
  // Keyed by `${communityId}:${subjectTag}`
  channels: Map<string, {
    messages: Message[]             // capped at 200 per channel (LRU)
    unreadCount: number
    channelRef: RealtimeChannel | null
    lastMessageTimestamp: string | null  // ISO string — used for reconnect cursor
    optimisticQueue: Message[]      // pending server confirmation
  }>

  activeChannelKey: string | null

  // LRU: evict oldest when channels.size > 10
  subscribe(communityId: string, subjectTag: string): void
  unsubscribeAll(): void
  addMessage(key: string, msg: Message): void          // direct insert (live events)
  addMessageBatch(key: string, msgs: Message[]): void  // reconnect re-fetch only
  confirmOptimistic(key: string, tempId: string, serverMsg: Message): void
  rollbackOptimistic(key: string, tempId: string): void
  setLastTimestamp(key: string, ts: string): void
}
```

**Memory bound:** `channels` Map is capped at 10 entries. On eviction (LRU), the channel is unsubscribed and messages are dropped. Re-entering that community triggers a fresh fetch.

---

## 5. Supabase Realtime Lifecycle

```
App lifecycle                    Channel state
─────────────────────────────────────────────────────
App launches        ──────────►  subscribe(communityId, subjectTag)
                                   channel SUBSCRIBED
User backgrounds    ──────────►  [iOS silently disconnects after ~10s]
                                   channel CLOSED (silent)
User foregrounds    ──────────►  AppState listener fires:
                    │            1. record lastMessageTimestamp from store
                    │            2. removeAllChannels()
                    │            3. re-subscribe(communityId, subjectTag)
                    │            4. fetch WHERE created_at > lastMessageTimestamp
                    │               (cursor-bounded, not "last 50")
                    │            5. addMessageBatch() — deduplicates against
                    │               any messages already arrived via new channel
                    ▼
                                   channel SUBSCRIBED + feed caught up
```

**heartbeatCallback:** monitor connection status. On `CLOSED` status: trigger the reconnect sequence above.

**Batch flush:** applies ONLY during step 5 (reconnect re-fetch). Live single-message events (step 3 normal flow) insert directly into `chatStore.addMessage()` with no delay. No artificial latency during governance deliberation.

---

## 6. Power Tree on Mobile

```
packages/ui/src/power-tree/
  types.ts      TreeNode, TreeData (shared with portal)
  layout.ts     placeNodes() — pure algorithm, no DOM/RN deps

apps/mobile/src/components/
  PowerTreeMini.tsx    <Svg> + <Circle> + <Line> from react-native-svg
```

### Mobile tree data fetch (2 queries, anon client)
The full `fetchPowerTree` uses the admin client and fetches 3 levels (for the web badge). Mobile needs only L1 (direct connections) for the bottom sheet mini tree:

```ts
async function fetchMobileTreeData(userId: string, subject: string, client: SupabaseClient) {
  const [upRes, downRes] = await Promise.all([
    // upstream: who delegates to me
    client.from('delegations')
      .select('delegator_id, users!delegator_id(display_name), accreditation_scores!delegator_id(score)')
      .eq('delegate_id', userId).eq('subject_tag', subject).eq('active', true),
    // downstream: who I delegate to
    client.from('delegations')
      .select('delegate_id, users!delegate_id(display_name), accreditation_scores!delegate_id(score)')
      .eq('delegator_id', userId).eq('subject_tag', subject).eq('active', true),
  ]);
  return { upstream: upRes.data ?? [], downstream: downRes.data ?? [] };
}
```

Pass the result into `placeNodes()` + `<PowerTreeMini>`. `delegations` table has `USING(true)` RLS for SELECT — no service role needed.

---

## 7. Nested Gesture Conflicts

FlashList (scroll) + swipe-to-revoke rows (horizontal pan) + bottom sheet (vertical pan) = three competing gesture recognizers.

Resolution pattern using Gesture Handler:
```tsx
// DelegationRow: wrap swipe in Gesture.Pan configured as horizontal only
const swipeGesture = Gesture.Pan()
  .activeOffsetX([-10, 10])  // only activates on horizontal movement
  .failOffsetY([-5, 5]);     // yields to vertical scroll if movement is vertical

// Bottom sheet: uses built-in gesture from @gorhom/bottom-sheet (Reanimated 3 native)
// FlashList: scroll is the default vertical gesture
// Result: no simultaneousHandlers needed — each gesture activates on a different axis
```

If using `@gorhom/bottom-sheet`, add the bottom sheet's `simultaneousHandlers` ref to the FlashList's `waitFor`.

---

## 8. Animation Strategy

**All animations use Reanimated 3.** No `Animated` API. Reason: Reanimated worklets run on the UI thread and stay smooth during JS-thread message parsing.

| Animation | Implementation |
|---|---|
| Diamond shimmer | `useSharedValue` + `withRepeat(withTiming(...))` in `AvatarRing` |
| Tier promotion pulse | `useSharedValue` → `withSequence(withSpring(1.4), withSpring(1.0))` + haptic |
| Power bar update | `useSharedValue` per segment + `withTiming(newWidth, {duration: 300})` |
| Bottom sheet | `@gorhom/bottom-sheet` (Reanimated 3 native) |
| Message entrance | `FadeInDown` from `react-native-reanimated/animations` (Entering prop on Animated.View) |
| Swipe to revoke | `Gesture.Pan` + `useAnimatedStyle` |

Diamond shimmer: only animate avatars that are currently visible (FlashList's `onViewableItemsChanged` controls a `isVisible` prop passed to `AvatarRing`). Stops the worklet when off-screen.

---

## 9. Test Strategy

**Framework:** Jest + React Native Testing Library + Maestro (E2E)

### Coverage targets

```
CODE PATHS                                       USER FLOWS
[+] placeNodes() (packages/ui)                   [+] Auth
  ├── zero nodes → []                              ├── [→E2E] Magic link → deep link → home screen
  ├── L1 only → correct angles/positions           └── [→E2E] Session persists after app restart
  ├── L1+L2 → correct parent-child positioning  [+] Delegation
  └── L1+L2+L3 + tailCount                        ├── [→E2E] Give Power → confirm → undo toast
[+] chatStore                                      └── [→E2E] Swipe-left revoke
  ├── optimistic insert → server confirm         [+] Chat feed
  ├── optimistic insert → rollback                 ├── [→E2E] Realtime message appears live
  ├── channel lifecycle (sub/unsub/evict)          └── [→E2E] AbsenceIndicator after 2h gap
  └── LRU eviction at 10 channels
[+] AvatarRing
  ├── Bronze → correct color (#cd7f32) + 1px ring
  ├── Gold → correct color (#f59e0b) + 2px ring
  └── Diamond → shimmer animation runs (Reanimated mock)
```

### Maestro + Realtime CI note
The "Realtime message appears" E2E test requires either:
- A dedicated Supabase project for CI (separate from production)
- Or a local Supabase instance (`supabase start` in CI)

Plan for a dedicated `loop-governance-ci` Supabase project. Seed with test community + test users. Keep separate from the production project.

---

## 10. New Screen: app.config.ts skeleton

```ts
export default {
  expo: {
    name: 'Loop Governance',
    slug: 'loop-governance',
    scheme: 'loopgov',
    version: '1.0.0',
    orientation: 'portrait',
    ios: {
      bundleIdentifier: 'live.loopcmbntr.governance',
      supportsTablet: false,
    },
    android: {
      package: 'live.loopcmbntr.governance',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      ['expo-font', { fonts: ['./assets/fonts/CabinetGrotesk-*.ttf', './assets/fonts/Geist-*.ttf', './assets/fonts/JetBrainsMono-*.ttf'] }],
    ],
  },
};
```

---

## Failure Modes

| Codepath | Failure | Tested? | Handled? | User sees |
|---|---|---|---|---|
| Magic link auth | User dismisses iOS system modal | No | No | Silent fail — lands nowhere | **CRITICAL GAP** (mitigated by Universal Links before App Store) |
| Realtime reconnect | Message dropped in reconnect window | Yes (cursor test) | Yes (cursor + dedup) | No missed messages |
| Optimistic insert | Server rejects message | Zustand rollback test | Yes | Message disappears (undo-able) |
| placeNodes zero nodes | Empty tree passed | Unit test | Returns [] gracefully | Empty bottom sheet |
| chatStore LRU evict | 11th channel opens | Unit test | LRU evicts oldest | Re-fetches on re-enter |
| AppState CLOSED status | Channel stays CLOSED after foreground | heartbeatCallback | Yes (retry) | Chat reconnects |
| EAS dev build | react-native-svg in Expo Go | Manual | Documented in setup | Clear error message |

---

## Worktree Parallelization

| Step | Modules touched | Depends on |
|---|---|---|
| A: packages/ui setup + placeNodes | packages/ui | — |
| B: apps/mobile scaffold + Metro config + eas.json | apps/mobile (config) | — |
| C: Auth flow (SecureStore + deep link) | apps/mobile/app/auth | B |
| D: chatStore + Realtime subscription | apps/mobile/src/stores | B |
| E: Chat screen (FlashList + components) | apps/mobile/app/(tabs)/chat | C, D |
| F: PowerTreeMini + mobile tree fetcher | apps/mobile/src/components, packages/ui | A, B |
| G: Power screen + delegation rows | apps/mobile/app/(tabs)/power | C, D |
| H: Profile screen | apps/mobile/app/(tabs)/profile | C |
| I: Tests (Jest + Maestro) | apps/mobile/__tests__ | E, F, G, H |

```
Lane A: packages/ui setup (independent)
Lane B: mobile scaffold + Metro + eas.json (independent)
         ├── Lane C: Auth (depends B)
         ├── Lane D: chatStore (depends B)
         └── Lane F: PowerTreeMini (depends A + B)

Launch Lane A + Lane B in parallel worktrees.
After both: launch Lane C + Lane D + Lane F in parallel.
Then Lane E (chat screen, depends C + D) + Lane G (power, depends C + D) + Lane H (profile, depends C).
Finally Lane I (tests, depends everything).
```

**Conflict flags:** Lane C and Lane D both touch `apps/mobile/src/` — coordinate on the store/auth boundary or keep to separate directories (`app/auth/` vs `src/stores/`).

---

## Implementation Tasks

```
- [ ] T1 (P1, human: ~2.5h / CC: ~25min) — packages/ui — Package setup + placeNodes migration (expanded)
    Surfaced by: Architecture (C1) + OV finding #5 + DX outside voice #2/#3
    Files: packages/ui/package.json, tsconfig.json, src/index.ts, src/power-tree/
    EXPANDED: Also export the Placed type (TreeNode & {x;y;r;angle}) from packages/ui/src/power-tree/layout.ts.
    EXPANDED: Update apps/console/src/lib/power-tree.ts to import from @loop/ui (delete the 206-line local copy).
    Verify: `pnpm --filter @loop/ui type-check` passes; `import { placeNodes, type Placed } from '@loop/ui'` resolves in apps/mobile AND apps/console

- [ ] T2 (P1, human: ~1h / CC: ~10min) — apps/mobile — Metro monorepo config
    Surfaced by: OV finding #5
    Files: apps/mobile/metro.config.js
    Verify: expo start resolves @loop/ui import without error

- [ ] T3 (P1, human: ~2h / CC: ~20min) — apps/mobile — EAS configuration
    Surfaced by: OV finding #10 + DX outside voice #14
    Files: apps/mobile/eas.json, .env setup for EAS secrets
    CRITICAL: eas.json development profile MUST include `"developmentClient": true`. Without this,
    `expo start --dev-client` cannot attach to the installed build (most common new dev setup failure).
    Required eas.json shape: { "build": { "development": { "developmentClient": true, "distribution": "internal" }, "preview": { "distribution": "internal", "channel": "preview" }, "production": { "channel": "production" } } }
    Verify: `eas build --profile development` installs dev client; `expo start --dev-client` connects immediately

- [ ] T4 (P1, human: ~3.5h / CC: ~35min) — apps/mobile — Auth + deep link + startup guard
    Surfaced by: Architecture (D7) + DX pass 3 (env guard) + DX outside voice #5 (PKCE)
    Files: app.config.ts, app/auth/callback.tsx, src/lib/supabase.ts
    REQUIRED: src/lib/supabase.ts must include startup guard:
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set. Check .env.local.')
    REQUIRED: app/auth/callback.tsx must call supabase.auth.exchangeCodeForSession(code) explicitly
      (PKCE flow: magic link delivers ?code= param, NOT a session token directly):
      const url = Linking.useURL(); const { queryParams } = Linking.parse(url);
      if (queryParams?.code) await supabase.auth.exchangeCodeForSession(queryParams.code as string)
    REQUIRED: signInWithOtp must pass emailRedirectTo: 'loopgov://auth/callback' (triggers PKCE flow)
    PREREQUISITE: Add loopgov://auth/callback to Supabase Dashboard > Auth > URL Configuration > Redirect URLs
    Verify: Magic link email → tap → iOS opens loopgov://auth/callback?code=XXX → exchangeCodeForSession → session in SecureStore → /(tabs)/chat

- [ ] T5 (P1, human: ~4.5h / CC: ~50min) — apps/mobile — Zustand store (3 slices)
    Surfaced by: Code Quality (C2) + DX outside voice #13 (LRU eviction UX)
    Files: src/stores/authStore.ts, chatStore.ts, subjectStore.ts
    LRU EVICTION UX: When a channel is evicted (11th channel opened), chatStore sets that channel's
    messages: [] and isLoading: true. Re-entering the community triggers re-fetch and sets isLoading: false
    when data arrives. Chat screen reads isLoading to show a loading skeleton (3 skeleton rows).
    Verify: Unit tests for chatStore (optimistic insert + LRU eviction + isLoading state) pass

- [ ] T6 (P1, human: ~4h / CC: ~1h) — apps/mobile — Realtime subscription + AppState lifecycle
    Surfaced by: Architecture (D3) + OV finding #2
    Files: src/hooks/useRealtimeChannel.ts, src/stores/chatStore.ts
    Verify: Background app → foreground → no missed messages (cursor-bounded re-fetch)

- [ ] T7 (P2, human: ~3h / CC: ~30min) — apps/mobile — PowerTreeMini component
    Surfaced by: Architecture (D2)
    Files: src/components/PowerTreeMini.tsx, src/lib/fetchMobileTreeData.ts
    Verify: Bottom sheet renders tree with correct tier colour; empty state renders correctly

- [ ] T8 (P2, human: ~7h / CC: ~1.25h) — apps/mobile — Chat screen (FlashList v2 + components)
    Surfaced by: Architecture (D5) + DX outside voice #12 (FlashList estimatedItemSize)
    Files: app/(tabs)/chat.tsx, src/components/MessageBubble.tsx, AvatarRing.tsx, PowerBar.tsx
    FLASHLIST: Set estimatedItemSize=72 (median for a 2-line message). Add onLayout callback to
    MessageBubble that logs measured heights to console during dev. After 20+ messages, check the
    median and update the constant if it deviates by >20%. Wrong estimate = scroll jank.
    LRU SKELETON: When channel isLoading=true (after eviction re-entry), render 3 skeleton message
    rows using Reanimated shimmer (same shimmer as AvatarRing diamond, ~60% opacity grey rects).
    Verify: Leadership messages show tier border; Diamond shimmer runs; AbsenceIndicator appears;
    LRU re-entry shows skeleton then resolves to messages

- [ ] T9 (P2, human: ~4h / CC: ~45min) — apps/mobile — Power screen + swipe revoke
    Surfaced by: Architecture (D4 gesture conflicts + §7)
    Files: app/(tabs)/power.tsx, src/components/DelegationRow.tsx
    Verify: Swipe-left reveals revoke action; vertical scroll is not broken

- [ ] T10 (P2, human: ~2h / CC: ~20min) — apps/mobile — Profile screen
    Files: app/(tabs)/profile.tsx, src/components/Sparkline.tsx
    Verify: Sparkline renders 30-day window; <3 data points shows caption

- [ ] T11 (P2, human: ~3h / CC: ~30min) — apps/mobile — turbo.json type-check task + env array
    Surfaced by: Architecture (D6) + DX outside voice #8 (cache invalidation)
    Files: turbo.json, apps/mobile/tsconfig.json
    REQUIRED: Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to turbo.json build
    task's env array (alongside existing NEXT_PUBLIC_* vars). Without this, Turborepo caches mobile
    builds when only EXPO_PUBLIC_ vars change, serving stale builds with wrong credentials.
    Verify: `turbo type-check` passes across all packages including mobile;
    Changing EXPO_PUBLIC_SUPABASE_URL in .env.local invalidates the Turbo cache

- [ ] T12 (P3, human: ~4h / CC: ~1h) — apps/mobile — Test suite (Jest + RNTL + Maestro)
    Surfaced by: Test review (T1)
    Files: apps/mobile/__tests__/, apps/mobile/e2e/ (Maestro flows)
    Verify: `jest` passes; Maestro auth flow completes on dev build

- [ ] T13 (P2, human: ~3h / CC: ~30min) — CI — Supabase CI project setup (REPRIORITISED P3→P2)
    Surfaced by: Test review (Maestro + Realtime) + DX outside voice #7 (T12 depends on T13)
    Files: .github/workflows/mobile-ci.yml (see mobile-devex-checklist.md Section A Step 8),
           packages/db/migrations/*.sql applied to CI project
    REPRIORITISED: T12 (Maestro E2E) and any CI touching auth or Realtime fails without a seeded DB.
    Run T13 BEFORE T12, ideally alongside T5/T6.
    MIGRATIONS: Apply all packages/db/migrations/*.sql in filename order to the CI Supabase project:
      for f in packages/db/migrations/*.sql; do psql "$CI_DATABASE_URL" -f "$f"; done
    Seed: create 1 test community + 2 test users (Bronze + Gold tier) in a fixtures script.
    Verify: Realtime E2E test passes against the CI Supabase project; type-check + lint pass in CI
```

## DX Implementation Tasks (from /plan-devex-review)

```
- [ ] DX-T1 (P1, human: ~15min / CC: ~2min) — repo root — Add root README.md
    Surfaced by: DX pass 1 (Discover stage — no README at root)
    Files: README.md
    Content: Project overview, one-liner per workspace (portal, console, mobile), startup commands.
    Verify: Opening the repo root shows README.md with `pnpm mobile:dev` command visible

- [ ] DX-T2 (P1, human: ~5min / CC: ~1min) — repo root — Add EXPO_PUBLIC_ vars to .env files
    Surfaced by: DX pass 3 (env var silent failure) + DX journey trace (INSTALL stage)
    Files: .env.example, .env.local
    Add: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (same values as NEXT_PUBLIC_)
    with comment: "# Mobile (Expo uses EXPO_PUBLIC_ prefix, not NEXT_PUBLIC_)"
    Verify: `grep EXPO_PUBLIC .env.local` returns 2 lines

- [ ] DX-T3 (P1, human: ~5min / CC: ~1min) — repo root — Add pnpm mobile:dev to root package.json
    Surfaced by: DX journey trace (REAL USAGE stage — two-terminal problem)
    Files: package.json
    Add to scripts: `"mobile:dev": "pnpm --filter apps/mobile expo start --dev-client"`
    Verify: `pnpm mobile:dev` from repo root starts Metro with --dev-client flag

- [ ] DX-T4 (P1, human: ~5min / CC: ~1min) — apps/mobile — Fix default expo start script
    Surfaced by: DX journey trace (HELLO WORLD stage — Expo Go trap)
    Files: apps/mobile/package.json
    Set dev script to: `"dev": "expo start --dev-client"` (NOT bare `expo start`)
    Verify: `cd apps/mobile && pnpm dev` starts Metro with --dev-client flag visible in output

- [x] DX-T5 (P1, human: ~0min / CC: ~30min) — sessions/ — Create mobile-devex-checklist.md
    Surfaced by: DX session deliverable
    Files: sessions/mobile-devex-checklist.md
    STATUS: COMPLETE (written by /plan-devex-review session)

- [ ] DX-T6 (P2, human: ~30min / CC: ~5min) — .github/ — Create mobile-ci.yml
    Surfaced by: DX pass 6 (CI YAML not in plan)
    Files: .github/workflows/mobile-ci.yml
    Content: See sessions/mobile-devex-checklist.md Section A Step 8 for complete YAML
    Two jobs: type-check (every PR), eas-build preview (on main merge only)
    Verify: PR to main triggers type-check job; merge to main triggers EAS preview build
```

---

## NOT in Scope (v1)

| Item | Rationale |
|---|---|
| Push notifications | Separate feature track: EAS credentials + Edge Function fan-out + permission UX. Deferred to v1.1 — see TODOS. |
| Universal Links (Associated Domains) | Requires live HTTPS domain + App Store distribution. Deferred until App Store submission. |
| Android App Links | Same as above. |
| Android Emulator / Google Play | iOS-first launch. Android setup (Android Studio, AVD, expo run:android, Play Internal Testing) in post-launch checklist. |
| Offline persistence (SQLite/MMKV) | Optimistic inserts are in-memory only. App kill = lose optimistic queue. Acceptable for v1. |
| Tablet layout | `useWindowDimensions()` handles phone widths; no structural breakpoints for tablet. |
| Proposals, Elections, Campaigns, Map, My Badge screens | Listed in Profile "MORE" section but not in 3-tab scope. Accessible as future screens. |
| `fetchPowerTree` sharing with mobile | Admin-client function stays server-side only. Mobile has its own 2-query anon-client fetcher. |
| `generateTreeSVG` on mobile | Full web badge (500×582, gradients, overlays). Mobile uses `<PowerTreeMini>` instead. |
| Sentry crash reporting | Post-launch: `expo install sentry-expo`, configure DSN, rebuild with preview profile. Free tier sufficient. |

---

## What Already Exists (reuse opportunities)

| Existing asset | Used in mobile? | How |
|---|---|---|
| `apps/portal/src/lib/power-tree.ts → placeNodes()` | Yes — moved to packages/ui | Pure layout algorithm, no DOM deps |
| `apps/portal/src/lib/power-tree.ts → TreeData/TreeNode types` | Yes — moved to packages/ui | Shared type shapes |
| `packages/db/migrations/*.sql` — delegations RLS | Yes | `USING(true)` on SELECT means anon client can read |
| Supabase backend (all tables) | Yes — unchanged | `@supabase/supabase-js` v2, same client lib |
| Design tokens (sessions/mobile-frontend-design-output.md) | Yes | Colors, spacing, typography all pre-defined |
| `packages/config` | Verify | Share ESLint/TypeScript config with mobile |

---

## TODOS.md Entries

```markdown
## Mobile App TODOs

- [ ] **T-MOB-01: Document mobile tree query shapes**
  Specify the 2 anon-client queries for `fetchMobileTreeData` in a shared spec before
  implementation. Prevents silent drift from `fetchPowerTree` server logic.
  Files: apps/mobile/src/lib/fetchMobileTreeData.ts
  Depends on: T1 (packages/ui setup)

- [ ] **T-MOB-02: Universal Links before App Store submission**
  Add Associated Domains entitlement to app.config.ts. Deploy AASA file at
  loopgov.loopcmbntr.live (or a governance subdomain). Test on TestFlight.
  Removes the dismissable system modal from the magic link auth flow.
  Blocked by: App Store distribution readiness.

- [ ] **T-MOB-03: Push notifications (v1.1)**
  Full push scope: EAS credential setup (APNs provisioning profile, FCM server key),
  Supabase Edge Function for fan-out logic (who to notify, when, deduplication),
  mobile permission request UX, deep link routing when app is killed.
  Depends on: v1 shipped + EAS production build verified.

- [ ] **T-MOB-04: Android setup (post-launch)**
  Install Android Studio, create AVD, expo run:android, set up Google Play Internal Testing.
  See sessions/mobile-devex-checklist.md Post-Launch Checklist for step-by-step.
  Depends on: iOS v1 shipped and stable.

- [ ] **T-MOB-05: Sentry crash reporting (pre-App Store)**
  expo install sentry-expo, configure DSN from sentry.io, rebuild with eas build --profile preview.
  Add to app.config.ts plugins list. Free tier: 5k errors/month.
  Must be done BEFORE public App Store release (not just TestFlight).
  Depends on: TestFlight v1 stable.

- [ ] **T-MOB-06: FlashList estimatedItemSize calibration (post-TestFlight)**
  After 20+ real messages visible in TestFlight, log measured heights with onLayout callback,
  compute median, update estimatedItemSize constant in chat screen if deviation > 20%.
  Files: app/(tabs)/chat.tsx
  Depends on: TestFlight build with real users.

- [ ] **T-MOB-07: Universal Links (pre-App Store)**
  Add Associated Domains entitlement to app.config.ts. Deploy AASA file at
  loopgov.loopcmbntr.live. Test on TestFlight. Removes iOS system modal from magic link flow.
  Blocked by: App Store distribution readiness.
```

---

## Completion Summary

- Step 0: Scope Challenge — push notifications deferred; core scope accepted as-is
- Architecture Review: 7 issues found, all resolved
- Code Quality Review: 2 issues found, both resolved
- Test Review: diagram produced, 12 gaps identified — framework selected (Jest + RNTL + Maestro)
- Performance Review: 1 issue found (message batching), resolved; batching scoped to reconnect only
- NOT in scope: written (8 items)
- What already exists: written (6 items)
- TODOS.md updates: 3 items proposed and accepted
- Outside voice: ran (Claude subagent) — 12 findings, 7 actioned (4 in plan, 3 as TODOs), 2 false positives (on-chain, USING(true) policy)
- Failure modes: 1 critical gap flagged (magic link iOS modal — mitigated by Universal Links TODO)
- Parallelization: 9 lanes, 4 parallel at peak / 5 sequential
- Lake Score: 13/13 recommendations chose complete option

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 10 issues, 1 critical gap (mitigated) |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 1 | CLEAR (PLAN) | score: 4/10 → 8/10, TTHW: 4min → 2min |

**OUTSIDE VOICE (Claude subagent):** 14 findings — 3 false positives, 5 accepted into plan (PKCE auth, console power-tree, T13 reorder, turbo env array, EAS dev profile), 4 added to TODOS (Android, Sentry, estimatedItemSize, Universal Links), 2 deferred (cursor clock skew low risk, shimmer mechanism sufficient with onViewableItemsChanged).

**VERDICT:** ENG CLEARED + DX CLEARED — ready to implement.

NO UNRESOLVED DECISIONS
