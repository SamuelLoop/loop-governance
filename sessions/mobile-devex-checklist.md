# Loop Governance Mobile — Developer Experience Checklist
**Date:** 2026-07-28
**Session:** mobile-04-devex-review
**For:** Samuel (solo developer, returning after any gap)
**Follows:** mobile-eng-plan-output.md

---

## Quick Reference

| Command | When to run |
|---------|-------------|
| `pnpm mobile:dev` | Daily dev (Metro hot reload) |
| `expo run:ios` | First build OR any native module change |
| `eas build --profile preview` | TestFlight build |
| `eas update --channel preview` | OTA update (JS-only changes) |
| `pnpm type-check` | Before opening a PR |

**Debug:** Press `Shift+m` in the Metro terminal → select **React Native DevTools** → opens in browser.
NOT Flipper (deprecated since Expo SDK 50).

---

## Section A: ONE-TIME SETUP (run once, never again)

### Prerequisites (verify first)

```bash
# Xcode installed and CLI tools active
xcode-select -p                    # should return a path
# Node + pnpm
node --version                     # 18+
pnpm --version                     # 10+
# EAS CLI
npm install -g eas-cli             # run once globally
eas --version                      # verify
# Expo CLI (global, for expo run:ios)
npm install -g expo-cli            # or: npx expo works without global install
```

### Step 1: Add EXPO_PUBLIC_ env vars to .env.local

Open `.env.local` at the repo root. Add these two lines (same values as your Supabase NEXT_PUBLIC_ vars):

```
# Mobile (Expo uses EXPO_PUBLIC_ prefix, not NEXT_PUBLIC_)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Verify: `grep EXPO_PUBLIC .env.local` should return 2 lines.

### Step 2: packages/ui setup (T1)

```bash
cd /path/to/loop-governance
# packages/ui/package.json, tsconfig.json, src/index.ts will be created by T1
# Verify after T1:
pnpm --filter @loop/ui type-check    # must pass
```

### Step 3: Metro monorepo config (T2)

`apps/mobile/metro.config.js` must exist (created by T2). Verify:

```bash
cat apps/mobile/metro.config.js | grep watchFolders   # must exist
```

### Step 4: EAS configuration (T3)

`apps/mobile/eas.json` must exist with three profiles. Verify content:

```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  },
  "submit": {}
}
```

**Critical:** `"developmentClient": true` in the development profile is required for `expo start --dev-client` to connect. Without it, Metro can't attach to the installed build.

### Step 5: EAS secrets (one-time, after EAS account setup)

```bash
# Login to EAS
eas login

# Set secrets (get values from Apple Developer account + App Store Connect)
eas secret:create --scope project --name APPLE_TEAM_ID --value "XXXXXXXXXX"
eas secret:create --scope project --name ASC_APP_ID --value "XXXXXXXXXX"

# EXPO_TOKEN is a GitHub Actions secret (not EAS secret)
# Add to GitHub repo: Settings > Secrets > Actions > New repository secret
# Name: EXPO_TOKEN, Value: from expo.dev account settings
```

### Step 6: Supabase redirect URL (one-time dashboard change)

Go to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs.
Add: `loopgov://auth/callback`

Without this, the magic link auth flow fails with a "redirect_uri_mismatch" error on login.

### Step 7: First iOS build (10-15 min, run ONCE per device/simulator)

```bash
cd apps/mobile
expo run:ios
# This installs the dev client on the iOS Simulator.
# Takes 10-15 minutes (CocoaPods install + Xcode build).
# Only needs to re-run when native modules change (see Section D).
```

After this succeeds, the dev client is installed on the simulator.

### Step 8: GitHub Actions CI (one-time)

Create `.github/workflows/mobile-ci.yml`:

```yaml
name: Mobile CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
    paths:
      - 'apps/mobile/**'
      - 'packages/ui/**'

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check

  eas-build:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: EAS Build (preview)
        run: eas build --profile preview --platform ios --non-interactive
        working-directory: apps/mobile
```

### Step 9: CI Supabase project (for E2E tests)

Create a separate Supabase project named `loop-governance-ci`.

```bash
# Apply all 39 migrations to the CI project in order:
psql "$CI_DATABASE_URL" -f packages/db/migrations/001_initial.sql
# ... repeat for each file in order (001 through 039)
# Or use a script:
for f in packages/db/migrations/*.sql; do psql "$CI_DATABASE_URL" -f "$f"; done

# Seed: create test community + 2 test users (see apps/mobile/__tests__/fixtures/)
```

Add CI_DATABASE_URL to GitHub Actions secrets. The Maestro E2E tests (T12) require this.

---

## Section B: DAILY COMMANDS

### Start the mobile dev server

```bash
# From the repo root:
pnpm mobile:dev
# This runs: expo start --dev-client
# Metro starts, shows a QR code (ignore — we use iOS Simulator)
```

### Open the app on iOS Simulator

With Metro running, press `i` in the Metro terminal to open the iOS Simulator.

Or in a second terminal:
```bash
open -a Simulator
```

The dev client must already be installed (Section A, Step 7). If not installed, run `expo run:ios` first.

### Hot reload

Press `r` in the Metro terminal to force a full reload.
Press `d` to open the Expo dev menu on the simulator.
Press `Shift+m` to open the React Native DevTools in a browser tab.

### Type check before a PR

```bash
# From repo root:
pnpm type-check
```

---

## Section C: BUILD COMMAND DECISION TABLE

| Scenario | Command | Time | Notes |
|----------|---------|------|-------|
| Daily dev (JS only) | `pnpm mobile:dev` | instant | Metro HMR |
| Added a native module | `expo run:ios` | ~4 min | Rebuilds native layer |
| First time setup | `expo run:ios` | ~15 min | CocoaPods + Xcode build |
| TestFlight (no Xcode) | `eas build --profile preview` | ~20 min | EAS cloud build |
| App Store submission | `eas build --profile production` | ~25 min | Signed release build |
| OTA JS fix | `eas update --channel preview` | ~30 sec | No build needed |

---

## Section D: OTA vs. FULL BUILD

### OTA safe (use `eas update --channel preview`)

Changes that are pure JavaScript/TypeScript:
- Component UI changes (colors, layout, text)
- Zustand store logic changes
- Chat message handling changes
- Power tree algorithm changes (placeNodes, layout)
- API call changes (Supabase queries)
- Animation tweaks (Reanimated worklet changes)
- Navigation changes within existing screens

### Full EAS build required (run `expo run:ios` or `eas build`)

Native layer changes:
- Adding a new Expo module: `expo install expo-camera` → **always rebuild**
- Changing `app.config.ts` iOS fields: `bundleIdentifier`, `scheme`, permissions
- Changing `app.config.ts` plugins list
- Adding a new font file to `assets/fonts/`
- Modifying `metro.config.js`
- Updating Expo SDK major version

### When OTA silently fails to update

If `eas update` succeeds but the app doesn't show the new code: close the app completely (double-tap Home, swipe up), reopen it. OTA updates apply on the NEXT app launch, not the current session.

---

## Section E: DEBUGGING

### React Native DevTools (primary debugger)

1. Start `pnpm mobile:dev`
2. Press `Shift+m` in Metro terminal
3. Select **React Native DevTools**
4. Opens in Chrome/browser: breakpoints, network tab, React tree inspector

### Zustand store inspection

Add to any screen for debugging (remove before TestFlight):
```ts
import { useAuthStore } from '../src/stores/authStore'
console.log('[DEBUG] auth', useAuthStore.getState())
```

### Supabase Realtime debugging

```ts
// In useRealtimeChannel.ts, enable debug logging:
const channel = supabase.channel('community:${communityId}:${subject}', {
  config: { presence: { key: userId } }
})
// Watch Metro terminal for SUBSCRIBED/CLOSED status changes
```

---

## Section F: TESTING WITH CLAUDE CODE

The Claude Code iOS Simulator tool (`mcp__Claude_Code_iOS_Simulator__control`) can attach to the booted simulator automatically during any Claude Code session.

When asking Claude Code to verify a UI change:
1. Have `pnpm mobile:dev` running
2. Have the iOS Simulator open with the app
3. Ask: "Take a screenshot of the chat screen" or "Tap the Give Power button"

Claude Code attaches to the running simulator for visual verification without a separate test run. Use this during implementation sessions (T8, T9, T10) to verify UI before writing formal tests.

---

## LAUNCH READINESS CHECKLIST (minimum to ship v1 to TestFlight)

- [ ] packages/ui type-check passes
- [ ] metro.config.js watchFolders + nodeModulesPaths configured
- [ ] eas.json has `developmentClient: true` in development profile
- [ ] EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local
- [ ] Startup guard in src/lib/supabase.ts throws if EXPO_PUBLIC_SUPABASE_URL undefined
- [ ] `loopgov://auth/callback` in Supabase redirect allow-list
- [ ] app/auth/callback.tsx calls `exchangeCodeForSession(code)` (PKCE flow)
- [ ] `expo run:ios` succeeds (dev client installed on Simulator)
- [ ] `pnpm mobile:dev` starts Metro and attaches to installed dev build
- [ ] Chat screen: messages load, Realtime subscription active
- [ ] Auth flow: magic link email → deep link → session in SecureStore → home screen
- [ ] Power screen: delegation bottom sheet opens
- [ ] `eas build --profile preview` succeeds
- [ ] TestFlight build installs on a physical device
- [ ] Privacy policy URL accessible: `loopcmbntr.live/privacy`
- [ ] `PrivacyInfo.xcprivacy` file present for any Expo modules that require it
- [ ] pnpm type-check passes with apps/mobile included (T11)
- [ ] `.github/workflows/mobile-ci.yml` passes on a PR

---

## POST-LAUNCH CHECKLIST (add after first real users)

- [ ] **Android setup:** Install Android Studio, create AVD, `expo run:android`, set up Google Play Internal Testing
- [ ] **Sentry crash reporting:** `expo install sentry-expo`, configure DSN, rebuild with `eas build --profile preview`
- [ ] **Universal Links:** Add Associated Domains entitlement to app.config.ts, deploy AASA file at `loopgov.loopcmbntr.live`, test on TestFlight (eliminates iOS system modal on magic link)
- [ ] **Push notifications (v1.1):** EAS credential setup (APNs + FCM), Supabase Edge Function fan-out, permission UX
- [ ] **Turbo cache calibration:** Verify `EXPO_PUBLIC_*` vars in turbo.json env array invalidate cache correctly on change
- [ ] **FlashList estimatedItemSize calibration:** Measure real message heights in TestFlight (median ~72pt), update constant in chat screen

---

## App Store Requirements Checklist (before public launch)

### iOS

- [ ] **PrivacyInfo.xcprivacy:** Required for apps using NSUserDefaults (expo-secure-store triggers this). Create `apps/mobile/ios/LoopGovernance/PrivacyInfo.xcprivacy` with the required privacy manifest entries.
- [ ] **Push notification entitlements:** Add to app.config.ts `ios.entitlements` (deferred to v1.1)
- [ ] **URL scheme registration:** `loopgov://` registered in `app.config.ts` `expo.scheme`
- [ ] **Privacy policy URL:** `loopcmbntr.live/privacy` must be live and accessible

### Android

- [ ] **targetSdkVersion:** Must be >= 35 (2025 Google Play requirement). Set in `app.config.ts` `android.targetSdkVersion`
- [ ] **URL scheme:** Registered in `app.config.ts` `android.intentFilters`

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `TypeError: Cannot read property 'auth' of undefined` | EXPO_PUBLIC_SUPABASE_URL not set | Check .env.local for EXPO_PUBLIC_SUPABASE_URL |
| `Module react-native-svg could not be found` | Running Expo Go instead of dev client | Run `expo run:ios` first, then `pnpm mobile:dev` |
| `Unable to resolve module '@loop/ui'` | Metro can't follow pnpm symlinks | Check `metro.config.js` watchFolders configuration |
| Dev client won't connect to Metro | `developmentClient: true` missing in eas.json | Rebuild with correct eas.json |
| Magic link auth goes nowhere | Missing `exchangeCodeForSession(code)` in callback | Check `app/auth/callback.tsx` implementation |
| OTA update sent but app unchanged | App needs to restart to apply update | Force-close app, reopen |
| EAS build fails: "not logged in" | EXPO_TOKEN not set in GitHub secrets | Add EXPO_TOKEN to repo secrets |
