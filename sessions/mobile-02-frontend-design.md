# Loop Governance Mobile: frontend design — 2026-07-28

## Run first

Read `sessions/mobile-design-consultation-output.md` (output from session 1).
Then invoke `/frontend-design` with the context below.

---

## Context

React Native (Expo) mobile app for the Loop Governance platform. Dark-first.
Tier accent colours: Diamond `#b9f2ff`, Platinum `#e5e4e2`, Gold `#f59e0b`,
Silver `#94a3b8`, Bronze `#cd7f32`.

**Three screens to design (in priority order):**

### Screen 1: Community Chat

The primary screen. Opened on app launch. Contains:

- **Subject switcher** — pill tabs across the top for the user's active subjects
  (governance, economics, ecology, etc.) — swipe to change subject
- **Dual-layer chat feed** — a single scrollable timeline showing both community
  and leadership messages. Leadership messages from high-tier users should be
  visually distinct (left border in tier colour, slightly larger avatar ring,
  tier badge on username) without being a separate panel or tab
- **Power bar** — a persistent slim bar (12px) at the very top of the chat area
  showing the tier distribution of the community in the current subject in
  proportional colour blocks (Bronze → Silver → Gold → Platinum → Diamond left
  to right). This is always visible; it is the "power at a glance" indicator
- **Message input** — pinned to the bottom, minimal, with a long-press option
  for leadership-only broadcast (visible only if user is Gold+)
- **Avatar tap** — tapping any user's avatar opens a bottom sheet showing their
  tier, power score, power tree (the SVG from the web badge, scaled), a
  "Delegate" button and an "Accredit" button

### Screen 2: Power (Delegation + Accreditation)

The second tab. Contains:

- **My Power Card** — compact version of the web badge (tier, score, mini tree)
  — not the full badge, just a card with the key numbers
- **Delegations** — who I have delegated to and who has delegated to me;
  swipe-to-revoke on my outgoing delegations
- **Accreditations** — who I have accredited and who has accredited me
- **Give Power** — a prominent CTA; opens search for a user by name or subject
  then a two-step confirmation (delegate or accredit)

### Screen 3: Profile + Settings

Third tab. Contains account settings, and all secondary features (proposals,
elections, earnings, badge share, map, campaigns) as a list of tappable rows
that navigate to full screens. These are real but not primary.

---

## Design deliverables

1. Annotated wireframes or high-fidelity mockups for all three screens
2. Component inventory: list every distinct UI component and its states
   (message bubble: leadership / community / own; avatar ring: each tier;
   power bar; subject pill; bottom sheet; tier badge)
3. Motion brief: where animation adds meaning (tier reveal, delegation
   confirmation, power bar update when someone joins)
4. Responsive notes: same design must work on iPhone SE (375pt wide) through
   Pro Max (430pt wide) and common Android sizes
5. Handoff spec: colour tokens, spacing scale, type scale, component states —
   in a format ready for the engineering plan session

Save outputs to: `sessions/mobile-frontend-design-output.md`
