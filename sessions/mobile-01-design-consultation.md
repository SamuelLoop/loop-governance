# Loop Governance Mobile: design consultation — 2026-07-28

## Run first

Invoke `/design-consultation` with the brief below as your input.

---

## Brief

You are the design consultant for a mobile app (iOS + Android) for the Loop
Governance platform. The platform exists at `gov.loopcmbntr.live` and
`console.loopcmbntr.live`. The web version is built on Supabase + Next.js. The
mobile app will be a new React Native (Expo) app sharing the same Supabase
backend.

**The platform in one sentence:** Citizens delegate governance power and
accredit expertise to community leaders, who then vote on proposals across ten
subject domains (governance, economics, ecology, health, technology, education,
culture, agriculture, energy, housing).

**The one thing this app must do brilliantly:**

Community chat. There are two chat layers that must coexist on the same screen:
- **Leadership chat:** messages from users above a power score threshold in the
  current subject — the inner circle talking
- **Community chat:** everyone in the community

The interface must visually reflect the power situation at all times. A
Diamond-tier leader's message should look and feel different from a Bronze
member's message without being exclusionary. The hierarchy should motivate
engagement, not shame low-tier members.

**The second most important thing:**

Delegation and accreditation. Users need to delegate their governance power to
someone they trust and accredit experts in a subject. These two actions are the
core mechanic that builds the power tree. They must be discoverable and
frictionless — ideally accessible directly from a chat message (tap a user's
avatar, see their tier and power tree, delegate or accredit in two taps).

**Everything else (proposals, elections, earnings, badge, campaigns, map) goes
in a settings/overflow menu.** Not hidden — just secondary. The tab bar should
have at most 3 tabs: Chat, Power (delegation + accreditation), and Profile.

**Tier system:**
- Diamond (500+, `#b9f2ff`)
- Platinum (200+, `#e5e4e2`)
- Gold (80+, `#f59e0b`)
- Silver (30+, `#94a3b8`)
- Bronze (0+, `#cd7f32`)

**Constraints for the consultation:**
- React Native (Expo) — one codebase for iOS and Android
- The Supabase backend already exists; the app is a new client, not a new backend
- Supabase Realtime handles chat (WebSocket push per user session)
- No chat history rewrite — use whatever chat table exists in Supabase
- The brand is Loop: dark backgrounds, tier colours as accents, minimal chrome

**What the consultation should produce:**
1. User journey map for the three core flows (chat, delegate, accredit)
2. Information architecture for the 3-tab structure
3. Interaction model for the dual-layer chat (how leadership and community
   messages coexist without two separate screens)
4. Power indicator design principles (how tier is shown on messages without
   being heavy-handed)
5. A list of open questions for the frontend design session (session 2)

Save outputs to: `sessions/mobile-design-consultation-output.md`
