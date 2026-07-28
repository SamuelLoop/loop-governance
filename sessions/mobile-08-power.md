# Loop Governance Mobile: Power tab (delegation + accreditation) — 2026-07-28

## Read first

- `sessions/mobile-frontend-design-output.md` — Power screen spec
- `sessions/mobile-brand-output.md` — My Power Card spec, tier badge spec
- `apps/mobile/src/lib/supabase.ts` — Supabase client
- `apps/mobile/src/theme/tokens.ts` — tokens
- `apps/mobile/src/app/(tabs)/chat.tsx` — reference for Realtime pattern

Attach the iOS Simulator panel before writing any code.

---

## Goal

A fully working Power tab. The user can:
- See their power score, tier, and mini power tree (My Power Card)
- See who they have delegated to and who has delegated to them
- Swipe to revoke an outgoing delegation
- See who they have accredited and who has accredited them
- Tap "Give Power" to delegate or accredit another user by searching by name

This session also wires up the "Delegate" and "Accredit" buttons from the
`UserBottomSheet` built in session 7 to the same confirmation flow.

---

## Components to build (in order)

### 1. `PowerCard`

A compact card at the top of the Power tab. Not the full badge — a summary.

Fetch:
```ts
const { data: stats } = await supabase
  .from("user_power_scores")         // if table exists (from scalability session)
  .select("score, tier")
  .eq("user_id", userId)
  .eq("subject", activeSubject)
  .maybeSingle();

// Fallback if user_power_scores doesn't exist yet:
// run the same queries as apps/portal/src/app/badge/[userId]/[subject]/power.ts
```

Contents:
- Display name + tier badge (large, in tier colour)
- Power score as a large number in tier colour
- Progress bar to next tier (same proportional bar as web console)
- Mini power tree: `SvgXml` with `generateTreeSVG()` output, `width="100%"` height
  auto — use `mode: "og"` (no overlays) so the tree renders cleanly in the card

### 2. `DelegationList`

Two sections: "Delegated to" (outgoing) and "Delegating to me" (incoming).

Fetch outgoing:
```ts
supabase.from("delegations")
  .select("id, subject_tag, active, users!delegate_id(display_name, avatar_url)")
  .eq("delegator_id", userId)
  .eq("active", true)
  .eq("subject_tag", activeSubject)
```

Fetch incoming (same query with delegator/delegate swapped).

**Swipe to revoke** (outgoing only):
Use `react-native-gesture-handler`'s `Swipeable` component. Swipe left reveals
a red "Revoke" button. On press:
```ts
await supabase.from("delegations")
  .update({ active: false })
  .eq("id", delegationId);
```
Optimistically remove from list. Restore on error with a toast.

### 3. `AccreditationList`

Same pattern as DelegationList. "Accredited by me" and "Accrediting me".
Swipe to revoke outgoing accreditations.

Fetch:
```ts
supabase.from("accreditations")
  .select("id, subject_tag, weight, active, users!receiver_id(display_name, avatar_url)")
  .eq("giver_id", userId)
  .eq("active", true)
  .eq("subject_tag", activeSubject)
```

### 4. `GivePowerSheet` (bottom sheet)

Triggered by "Give Power" FAB (floating action button, bottom right, tier colour).
Also opened when "Delegate" or "Accredit" is tapped from `UserBottomSheet` in chat
(pass `targetUserId` as a param so the sheet skips the search step).

Two steps:

**Step 1 — Search (skip if targetUserId provided):**
Text input with real-time search:
```ts
supabase.from("users")
  .select("id, display_name, avatar_url")
  .ilike("display_name", `%${query}%`)
  .limit(10)
```
Results list with avatar, name, tier badge. Tap to select.

**Step 2 — Confirm:**
Shows the selected user's name and tier. Two large buttons side by side:
- "Delegate" (amber, `colors.tier.gold`) — calls:
  ```ts
  await supabase.from("delegations").insert({
    delegator_id: currentUserId,
    delegate_id: targetUserId,
    subject_tag: activeSubject,
    community_id: activeCommunityId,
    active: true,
  });
  ```
- "Accredit" (blue, `colors.tier.diamond`) — calls:
  ```ts
  await supabase.from("accreditations").insert({
    giver_id: currentUserId,
    receiver_id: targetUserId,
    subject_tag: activeSubject,
    weight: 1,
    active: true,
  });
  ```

On success: dismiss sheet, show a brief success animation (the tier badge of
the target user pulses once in their tier colour), refresh the delegation list.

---

## Profile tab (minimal — do in this session too)

The third tab just needs to be functional, not beautiful.

`apps/mobile/src/app/(tabs)/profile.tsx`:
- User's display name, email, avatar
- "Sign out" button (`supabase.auth.signOut()`)
- A `SectionList` of secondary features, each navigating to a web view or
  placeholder: Proposals, Elections, Earnings, Badge, Campaigns, Map
  (Use `expo-web-browser` to open `console.loopcmbntr.live/{feature}` for
  any feature not built natively — this is the fastest path to a complete app)
- Subject switcher: "Active subject" row shows current subject with a picker

---

## Realtime: delegation received notification

When a delegation INSERT is received for the current user, show an in-app toast:
```ts
supabase
  .channel(`delegations:${userId}`)
  .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "delegations",
        filter: `delegate_id=eq.${userId}` },
      (payload) => showToast(`${payload.new.delegator_name} delegated to you in ${payload.new.subject_tag}`))
  .subscribe();
```
Set this up in the root `_layout.tsx` so it runs regardless of which tab is active.
Clean it up in the layout's unmount.

---

## After building

1. Screenshot: Power Card, Delegation list, Give Power sheet (each step)
2. Run `/ios-design-review`
3. Run `/ios-qa` — test: delegate to a user, confirm it appears in incoming
   for that user (test with Supabase Studio insert if second device unavailable),
   revoke a delegation by swiping, accredit a user
4. Run `/qa` for the full app — Chat tab + Power tab together, switching subjects,
   signing out and back in

---

## Deliverable

- Working Power tab committed to `apps/mobile/`
- Profile tab with sign-out and web-view fallbacks for secondary features
- Delegation and accreditation create + revoke working end-to-end
- Realtime delegation toast working
- `/ios-qa` sign-off screenshot saved to `sessions/mobile-power-qa.md`
- The app is now shippable to TestFlight — run `/ship` if EAS Build is configured
