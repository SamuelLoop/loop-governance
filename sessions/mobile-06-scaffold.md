# Loop Governance Mobile: scaffold + auth + navigation — 2026-07-28

## Read first

- `sessions/mobile-eng-plan-output.md` — approved stack and architecture
- `sessions/mobile-devex-checklist.md` — Turbo + Metro integration steps
- `apps/mobile/src/theme/tokens.ts` — if session 5 ran; otherwise use the
  token values in `sessions/mobile-05-brand.md` directly

---

## Goal

Get a running Expo app in `apps/mobile/` with:
- The 3-tab navigation structure (Chat, Power, Profile)
- Supabase auth working (magic link + deep link callback)
- Design tokens applied everywhere
- Empty placeholder screens that prove the structure is correct
- The app rendering in the iOS Simulator via the Claude Code iOS Simulator tool

This session produces NO feature code. Screens are empty shells. The point is
that auth works and the nav structure is right before building anything on top.

---

## Step 1: Initialise Expo in the monorepo

From the repo root (`/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-governance`):

```bash
npx create-expo-app apps/mobile --template blank-typescript
```

Then update `pnpm-workspace.yaml` to include `apps/mobile` if not already
covered by `apps/*`.

Add to `turbo.json` tasks:
```json
"mobile#dev": { "cache": false, "persistent": true },
"mobile#build": { "dependsOn": ["^build"], "outputs": ["dist/**"] }
```

---

## Step 2: Install dependencies

```bash
cd apps/mobile
npx expo install expo-router @supabase/supabase-js @react-native-async-storage/async-storage \
  react-native-url-polyfill expo-linking expo-constants expo-status-bar \
  react-native-safe-area-context react-native-screens @shopify/flash-list \
  react-native-svg react-native-gesture-handler react-native-reanimated \
  expo-secure-store zustand
```

---

## Step 3: App config

`apps/mobile/app.config.ts`:
```ts
export default {
  name: "Loop Governance",
  slug: "loop-governance",
  scheme: "loopcmbntr",        // deep link: loopcmbntr://
  version: "1.0.0",
  platforms: ["ios", "android"],
  ios: { bundleIdentifier: "live.loopcmbntr.governance" },
  android: { package: "live.loopcmbntr.governance" },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};
```

`apps/mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=<from Supabase dashboard — same project as web>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

---

## Step 4: Supabase client

`apps/mobile/src/lib/supabase.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const storage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  Constants.expoConfig!.extra!.supabaseUrl,
  Constants.expoConfig!.extra!.supabaseAnonKey,
  { auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }
);
```

---

## Step 5: Auth flow

`apps/mobile/src/app/_layout.tsx` — root layout with session check:
- On mount, call `supabase.auth.getSession()`
- If no session, redirect to `/(auth)/login`
- If session, redirect to `/(tabs)/chat`
- Listen for `supabase.auth.onAuthStateChange` to handle magic link callback

`apps/mobile/src/app/(auth)/login.tsx`:
- Email input + "Send magic link" button
- Calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'loopcmbntr://auth/callback' } })`
- Shows "Check your email" confirmation after send

`apps/mobile/src/app/auth/callback.tsx`:
- Expo Router deep link handler for `loopcmbntr://auth/callback`
- Reads the token from the URL params
- Calls `supabase.auth.verifyOtp(...)` to complete sign-in
- Navigates to `/(tabs)/chat` on success

Add the redirect URL `loopcmbntr://auth/callback` to Supabase Dashboard >
Auth > URL Configuration > Redirect URLs allow-list.

---

## Step 6: Tab navigation

`apps/mobile/src/app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from "expo-router";
import { colors } from "@/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: colors.bg.primary, borderTopColor: colors.border },
      tabBarActiveTintColor: colors.tier.gold,
      tabBarInactiveTintColor: colors.text.muted,
      headerShown: false,
    }}>
      <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: ... }} />
      <Tabs.Screen name="power" options={{ title: "Power", tabBarIcon: ... }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ... }} />
    </Tabs>
  );
}
```

Each tab screen is an empty `<View>` with the screen name as text — no
feature code yet.

---

## Step 7: Verify in simulator

Use the Claude Code iOS Simulator tool:
1. `mcp__Claude_Code_iOS_Simulator__control` with `action: "attach"` first
2. Run `npx expo run:ios` from `apps/mobile/`
3. Take a screenshot to confirm:
   - Login screen appears on first launch
   - Magic link email is sent (test with a real email)
   - After auth, tabs appear
   - All 3 tabs navigate correctly
   - Dark background (#090909) is correct throughout

Run `/ios-design-review` on the screenshots before closing the session.

---

## Deliverable

- `apps/mobile/` directory committed to the repo with the scaffold above
- Auth flow working end-to-end in the iOS Simulator
- All 3 tabs navigating to empty placeholder screens
- `apps/mobile/.env.example` committed (not `.env`)
- Token budget: do not implement any data fetching or feature UI in this session
