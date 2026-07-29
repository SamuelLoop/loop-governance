# Loop Governance: fix mobile auth_id linking + seed real data for samuel@loopinc.live — 2026-07-29

## Context

The mobile app (`apps/mobile`, Expo SDK 54) now genuinely works end-to-end for
authentication: SDK downgrade, routing, and the Supabase magic-link email
template bug are all fixed (see `sessions/bugfix-backlog.md` and git log for
2026-07-29). Samuel successfully signed in via the 6-digit OTP code on his
iPhone 11 Pro Max. **But nothing past login works**: Profile shows "Not
signed in," Power shows "Sign in to see your power," and the message
composer in Chat is disabled and won't send.

This session diagnosed the root cause already — don't re-diagnose, just fix
it and verify:

## Root cause (confirmed, not a guess)

`apps/mobile/src/app/(tabs)/chat.tsx` has the *only* place that populates
`useAuthStore`'s `profile`:

```ts
const { data: user } = await supabase
  .from('users')
  .select('id, display_name, avatar_url')
  .eq('auth_id', session.user.id)
  .single();
if (!user) return; // profile never gets set
```

This queries the app's own `public.users` table (see
`packages/db/src/schema/users.ts` — `authId` links to Supabase Auth's
`auth.users.id`, `email` is separately unique). Every other symptom cascades
from this one query returning null:

- `Profile.tsx` and `Power.tsx` both gate their entire UI on `if (!profile)`.
- `MessageInput.tsx`'s send button requires `!!currentUserId` (which is
  `profile?.id`) AND `!!communityId` (which comes from `subjectStore`,
  populated by a *separate* chat.tsx effect that itself requires
  `if (!profile) return;` before it loads community memberships). Both
  conditions trace back to the same missing profile.

**Why the row is missing:** `scripts/seed-test-data.js` already has a
hardcoded `const SAMUEL = "02c63176-10c3-4211-846f-1b363c5f3307";` —
Samuel very likely already has a `public.users` row from prior seeding
work. But the mobile app's OTP sign-in on 2026-07-29 created a *fresh*
`auth.users` entry (Supabase Auth's own new-user creation on first
`signInWithOtp`), which almost certainly has a different `id` than
whatever `auth_id` (if any) the existing seeded row currently points to.
**This is very likely a linking problem, not a from-scratch seeding
problem** — verify before assuming either way.

---

## Step 1: Find the real auth_id

```bash
cd "/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-trading"
supabase db query --linked --output json "
select id, email, created_at
from auth.users
where email = 'samuel@loopinc.live'
order by created_at desc;
"
```

If multiple rows come back (plausible — Samuel has tested login via portal,
console, and now mobile, and each `signInWithOtp` for a genuinely new email
creates one `auth.users` row, but repeat sign-ins for the *same* email
reuse the same row), take the most recent `id`. Cross-reference against
which `id` the mobile app actually received — you can add a temporary
`console.log(session.user.id)` in `chat.tsx`'s profile-loading effect and
watch `/tmp/expo-dev-server.log` while Samuel reloads the app once, the
same technique used earlier this session to debug the redirect URL.

## Step 2: Check the existing public.users row

```bash
supabase db query --linked --output json "
select id, auth_id, email, display_name
from public.users
where id = '02c63176-10c3-4211-846f-1b363c5f3307'
   or email = 'samuel@loopinc.live';
"
```

Three possible outcomes:
- **A row exists with the SAMUEL id, email matches, auth_id is null or
  wrong** — just `UPDATE public.users SET auth_id = '<real-id>' WHERE id =
  '02c63176-...'`.
- **A row exists with a different/placeholder email** (e.g. a seed-test
  fake address) — decide whether to repoint that row's email + auth_id to
  the real account, or leave the seeded row as fictional test data and
  create a fresh row for the real account instead. Check
  `scripts/seed-test-data.js` and `scripts/seed-users.mjs` for what email
  convention they actually used for the SAMUEL row before deciding.
- **No row exists at all** — insert one, following the exact column set in
  `packages/db/src/schema/users.ts`.

## Step 3: Seed enough surrounding data to make the app meaningful

A bare `users` row alone will stop the "not signed in" symptom but the app
will still look empty. At minimum:
- One `community_memberships` row so `subjectStore` populates
  `activeCommunityId` (required for Chat's message composer and Power's
  community-scoped display).
- A few `accreditation_scores` / `delegations` rows so Power/Profile show
  a non-zero tier and score, not just an empty state.
- Check whether `scripts/seed-users.mjs`'s `COMMUNITY_ID` constant
  (`"5ab727a9-e213-4cb7-a7de-89dff3db0231"`, labeled "Global") is a
  reasonable community to join Samuel to, or whether a different one fits
  better for realistic mobile testing.

`scripts/seed-test-data.js` may already do some or all of this for the
SAMUEL id — read the full file (not just the head) before writing new
seed logic, to avoid duplicating what already exists.

## Step 4: Fix message sending specifically

Once `profile` and `activeCommunityId` are both populated, re-test
`MessageInput.tsx`'s send flow directly (not just that the button becomes
enabled) — confirm a real row lands in `public.messages` and shows up in
the Chat feed via the realtime subscription in
`apps/mobile/src/hooks/useRealtimeChannel.ts`. This session found the
*disabled button* cause but never got to test an actual successful send,
since profile was never populated during this session's testing.

## Step 5: Full re-verification on the real device

Don't just check the database — have Samuel actually reload the app and
confirm, screen by screen:
- Profile shows his real name/tier/score, not "Not signed in."
- Power shows real score/delegation/accreditation counts, not "Sign in to
  see your power."
- Chat's composer is enabled and a sent message actually appears (check
  it persists after a reload, not just optimistically in the UI).

## What success looks like

- `public.users` has a row for samuel@loopinc.live with `auth_id` matching
  the real, current Supabase Auth user id used by the mobile app.
- Enough seed data exists (community membership, at least placeholder
  accreditation/delegation data) that Profile and Power show real content.
- A message sent from the mobile app's Chat tab is confirmed to persist in
  `public.messages` and reappear after a full app reload.
- No changes to auth flow code from this session (SDK 54 pin, login.tsx,
  index.tsx, magic-link template) — this session is data/linking only,
  don't re-touch what's already fixed and verified working.
