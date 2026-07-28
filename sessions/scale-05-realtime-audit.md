# Loop Governance: Realtime subscriptions audit — 2026-07-28

## Context

The Loop Governance platform (`/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-governance`)
uses Supabase Realtime for live updates (vote counts, delegation events, etc.).
Supabase Realtime works by broadcasting Postgres WAL changes over WebSockets.

At 100M users, two things break:

1. **Channel limits.** Supabase has per-project channel limits (Supabase Pro:
   500 concurrent channel subscriptions on the free Realtime tier; paid add-on
   or Enterprise needed for more). At 100M users, even if 0.01% are online
   simultaneously, that is 10,000 WebSocket connections — far above the free limit.

2. **Fan-out.** A single high-activity event (e.g., a Diamond-tier governance
   proposal gets 10,000 votes in an hour) broadcasts WAL changes to every client
   subscribed to that proposal's channel simultaneously. Supabase's Realtime
   server becomes the bottleneck.

This session does not replace Supabase Realtime — it audits what the codebase
currently subscribes to, measures what is truly real-time-sensitive vs what can
be polled, and creates a plan for migrating high-cardinality subscriptions to a
lighter model.

---

## Step 1: Audit all Supabase Realtime subscriptions

Search the codebase for every `supabase.channel(` and `.on('postgres_changes'`
call. Run:

```bash
grep -rn "supabase\.channel\|\.on('postgres_changes\|useRealtime\|RealtimeChannel" \
  apps/ packages/ --include="*.ts" --include="*.tsx"
```

This grep covers `apps/mobile/` automatically. One known mobile subscription
exists before you run this: `apps/mobile/src/hooks/useRealtimeChannel.ts`.

For each match, document:
- File path and line
- Which table it subscribes to
- What events it listens for (INSERT, UPDATE, DELETE)
- What UI it drives (what does the user see update in real time)
- How many concurrent users might have this subscription open simultaneously

Produce a table like:

| File | Table | Events | UI driven | Concurrent users |
|---|---|---|---|---|
| ... | proposals | UPDATE | vote count badge | all users viewing proposals |
| ... | delegations | INSERT | "new delegation" toast | the delegate's console |
| `apps/mobile/src/hooks/useRealtimeChannel.ts` | `messages` | INSERT | live community chat feed | all users with the Chat tab open |

The mobile subscription filters by `community_id` so each user has exactly one
channel open at a time (the active community). Switching communities unsubscribes
and re-subscribes. It re-subscribes on `AppState` change to `active` (app
foreground). This is **Class A** — live chat is latency-sensitive and cannot be
polled. Keep as Realtime. Verify cleanup: the hook calls `supabase.removeChannel()`
in the `useEffect` cleanup and on `AppState` change — confirm no leak when the
community switches rapidly.

### Classification

After auditing, classify each subscription:

**Class A — Truly real-time (keep as Realtime):**
- Low-cardinality, personal: "someone delegated to ME" — only the delegate has
  this channel open; O(1) fan-out
- Latency-sensitive: voting deadline countdown, live proposal pass/fail

**Class B — Near-real-time (replace with 30s polling):**
- Aggregate counts that update frequently: vote totals on a proposal page
- These do not need WebSocket push; SWR or TanStack Query with a 30s refetch
  interval is imperceptibly slower and uses zero WebSocket connections

**Class C — Background data (replace with on-navigation refresh):**
- Dashboard stats, community membership counts, earnings summaries
- No user expects these to update in real time within the same page view

---

## Step 2: Replace Class B subscriptions with SWR polling

For any subscription classified as Class B, replace:

```ts
// Before: WebSocket subscription
const channel = supabase
  .channel(`proposal-${id}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes',
      filter: `proposal_id=eq.${id}` }, () => refetch())
  .subscribe();
```

With SWR or TanStack Query:

```ts
// After: 30-second polling
const { data } = useSWR(
  `/api/proposals/${id}/counts`,
  fetcher,
  { refreshInterval: 30_000 }
);
```

The API route `/api/proposals/[id]/counts` reads from `proposal_vote_counts`
(materialised in session scale-02) — a single-row lookup, no COUNT(*).

---

## Step 3: Add Supabase Realtime presence tracking (for Class A)

For the personal "someone delegated to me" notification, keep Supabase Realtime
but use presence channels rather than postgres_changes to reduce WAL load:

```ts
const room = supabase.channel(`user:${userId}`);
room.on('broadcast', { event: 'delegation' }, (payload) => {
  // show toast
}).subscribe();
```

The server-side trigger (from the `delegations` table trigger added in
`NEXT-SESSION-scaling-power-scores.md`) broadcasts to the user's personal channel
rather than letting every client watch the `delegations` WAL table directly.

This pattern:
- Reduces WAL broadcast volume (only personal channels get events)
- Keeps Realtime for the UX that actually needs it
- Is compatible with Supabase's Realtime tier limits

---

## Step 4: Document the Realtime capacity plan

After the audit, write `docs/realtime-capacity.md` in the repo documenting:
- Which subscriptions remain on Realtime (Class A)
- Which subscriptions were moved to polling (Class B)
- Estimated peak WebSocket connections at 10K / 100K / 1M concurrent users
- At what user count to upgrade the Supabase Realtime plan or migrate to
  Ably / Pusher / self-hosted

---

## TDD test suite

Place tests in `apps/portal/src/__tests__/scaling/realtime-audit.test.ts`.

```
R1  No postgres_changes subscription on votes table (high-cardinality)
    Assert: grep for .on('postgres_changes'... table: 'votes') returns zero results
    (After replacing Class B subscriptions in step 2)

R2  No postgres_changes subscription on proposals table (high-cardinality)
    Assert: grep returns zero results for postgres_changes on 'proposals' table

R3  Proposal vote count component uses polling, not WebSocket
    Assert: the proposal detail page imports SWR or TanStack Query for vote counts
    Assert: no supabase.channel() call exists in the proposal detail component

R4  Poll interval is 30 seconds or less for vote counts
    Assert: refreshInterval value in SWR config <= 30000

R5  Personal delegation notification still uses Realtime (Class A)
    Assert: a channel for 'broadcast' + 'delegation' event exists in console code
    Assert: it is scoped to the current user's ID (not a table-wide subscription)

R6  SWR proposal counts endpoint returns correct data
    GET /api/proposals/{id}/counts
    Assert: HTTP 200
    Assert: JSON body includes { yes_count, no_count, total_count }
    Assert: values match proposal_vote_counts table

R7  Proposal counts API reads from materialised table (not COUNT(*))
    Assert: the API route reads from proposal_vote_counts
    Assert: no raw COUNT(*) query on votes table in this route

R8  On-mount WebSocket connection count is bounded
    Render the console dashboard with a mocked auth session
    Assert: supabase.channel() is called at most 3 times (one per Class A subscription)
    Assert: no channel is created for aggregate stats

R9  Channel cleanup on unmount (no connection leak)
    Mount and unmount the console dashboard component
    Assert: supabase.removeChannel() is called for every channel created on mount

R10 Application loads correctly when Supabase Realtime is unreachable
    Mock supabase.channel().subscribe() to throw
    Assert: page renders with static data (last-fetched values)
    Assert: error is logged; no user-visible crash

R11 Mobile chat channel cleans up on community switch (no leak)
    Mount useRealtimeChannel with communityId = 'A'
    Change communityId to 'B'
    Assert: supabase.removeChannel() was called with the channel for 'A'
    Assert: only one active channel exists after the switch

R12 Mobile chat channel re-subscribes on app foreground (AppState active)
    Mount useRealtimeChannel; simulate AppState change to 'background' then 'active'
    Assert: unsubscribe is called before re-subscribe
    Assert: fetchMessages is called with lastTimestamp to avoid re-fetching old messages
```

---

## Key constraints

- This session is an audit-first, implement-second session. Do Step 1 and
  produce the classification table before writing any code.
- Do not remove any Class A (personal, low-cardinality) Realtime subscriptions
  — these provide meaningful UX and have acceptable scale characteristics
- The SWR polling replacement (Step 2) depends on the `proposal_vote_counts`
  table from session `scale-02` — confirm that migration is applied first
- Supabase Realtime is not available in Vercel Edge functions or middleware —
  it only works in client components or Node.js server routes
- Write `docs/realtime-capacity.md` as a plain markdown doc, not a memory file
