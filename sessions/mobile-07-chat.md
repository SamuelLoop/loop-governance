# Loop Governance Mobile: community chat screen — 2026-07-28

## Read first

- `sessions/mobile-frontend-design-output.md` — Chat screen spec and component inventory
- `sessions/mobile-brand-output.md` — message bubble spec, power bar spec, tier badge spec
- `sessions/mobile-eng-plan-output.md` — Realtime lifecycle plan and chat architecture
- `apps/mobile/src/lib/supabase.ts` — existing Supabase client (from session 6)
- `apps/mobile/src/theme/tokens.ts` — design tokens

Attach the iOS Simulator panel (`mcp__Claude_Code_iOS_Simulator__control action:"attach"`)
before writing any code. Build and screenshot after each major component.

---

## Goal

A fully working Chat tab. The user can:
- See all messages in their active subject community
- See leadership messages (Gold+) visually distinguished
- Send a message
- Tap an avatar and see the user's tier + power tree in a bottom sheet
- Switch between subject communities via the subject pill switcher

---

## Data model to understand first

Before implementing, read the existing Supabase schema. Run this query in
Supabase Studio to find the chat/messages table structure:
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name ILIKE '%message%' OR table_name ILIKE '%chat%'
ORDER BY table_name, ordinal_position;
```
If no messages table exists, it needs to be created. Check `packages/db/migrations/`
for any existing chat migrations first.

**If a messages table needs to be created:**
```sql
CREATE TABLE messages (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body         TEXT NOT NULL CHECK (char_length(body) <= 2000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_community_created ON messages (community_id, created_at DESC);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members can read community messages"
  ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM community_memberships
            WHERE community_id = messages.community_id AND user_id = auth.uid())
  );
CREATE POLICY "members can insert messages"
  ON messages FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM community_memberships
            WHERE community_id = messages.community_id AND user_id = auth.uid())
  );
```

---

## Components to build (in order)

### 1. `SubjectSwitcher`

Horizontal scrollable pill row. Each pill = one subject the user is a member of.
Active pill: tier colour background. Inactive: muted border.
On press: sets `activeSubject` in Zustand store and resets the message feed.

```ts
// Zustand store: apps/mobile/src/store/chat.ts
interface ChatStore {
  activeSubject: string;
  activeCommunityId: string | null;
  setSubject: (subject: string, communityId: string) => void;
}
```

### 2. `PowerBar`

12px strip. Reads tier distribution from `community_memberships` joined with
`user_power_scores` (if that table exists from scalability sessions) or falls
back to computing on client. One horizontal strip of coloured segments. Animate
width changes with Reanimated `useSharedValue`.

Fetch: on community switch, query:
```sql
SELECT tier, COUNT(*) as count
FROM user_power_scores
WHERE community_id = $1
GROUP BY tier
```

### 3. `MessageBubble`

Props: `message`, `senderTier`, `isOwn`, `isLeadership` (sender score >= 80).

States from the brand spec:
- Own message: right-aligned, `colors.bg.elevated`, tier-coloured left border
- Leadership message: full-width, tier colour at 8% opacity bg, 3px left border, tier badge
- Community message: left-aligned, `colors.bg.card`, no border
- System message (delegation event): centred, no bubble, tier colour text

Avatar: circular, 36px. On press: open `UserBottomSheet`.

### 4. `MessageFeed` (FlashList)

```ts
// Initial load
const { data } = await supabase
  .from("messages")
  .select(`id, body, created_at, user_id,
           users!inner(display_name, avatar_url),
           user_power_scores(score, tier)`)
  .eq("community_id", activeCommunityId)
  .order("created_at", { ascending: false })
  .limit(50);
```

Realtime subscription (set up on community mount, tear down on unmount):
```ts
const channel = supabase
  .channel(`chat:${communityId}`)
  .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "messages",
        filter: `community_id=eq.${communityId}` },
      (payload) => prependMessage(payload.new))
  .subscribe();

return () => supabase.removeChannel(channel); // MUST clean up on unmount
```

Use FlashList with `inverted` prop so newest messages are at the bottom.
Estimated item size: 72px. `keyExtractor`: `item.id`.

### 5. `MessageInput`

Pinned to bottom with `KeyboardAvoidingView`. Text input + send button.
On send:
```ts
await supabase.from("messages").insert({
  community_id: activeCommunityId,
  user_id: currentUserId,
  body: text.trim(),
});
```
Optimistic insert: add the message to local state immediately, remove if the
insert fails (show an error toast).

Long-press on send button: if user tier is Gold+, offer "Leadership broadcast"
which sets a `is_leadership` boolean on the message (requires schema column).

### 6. `UserBottomSheet`

Triggered by avatar press. Uses `@gorhom/bottom-sheet` (install it: `npx expo install @gorhom/bottom-sheet`).

Contents:
- Avatar + display name + tier badge
- Power score (large number in tier colour)
- Mini power tree: render the SVG from `generateTreeSVG()` via `react-native-svg`'s
  `SvgXml` component — import the function from `packages/ui` (or copy from
  `apps/portal/src/lib/power-tree.ts` if packages/ui isn't set up yet)
- "Delegate" button → navigates to delegation confirmation screen
- "Accredit" button → navigates to accreditation confirmation screen

---

## After building

1. Screenshot each component state in the simulator
2. Run `/ios-design-review` — paste the screenshots and the brand spec from
   `sessions/mobile-brand-output.md`
3. Run `/ios-qa` — test: send a message, receive a message (open a second
   simulator or use the web console to insert a row), tap an avatar, switch subjects
4. Fix any issues flagged before closing the session

---

## Deliverable

- Working Chat tab committed to `apps/mobile/`
- Supabase Realtime subscription proven to push messages in real time
- UserBottomSheet opening with correct tier and power tree
- All FlashList performance metrics acceptable (no dropped frames on 50-message scroll)
- `/ios-design-review` sign-off screenshot saved to `sessions/mobile-chat-qa.md`
