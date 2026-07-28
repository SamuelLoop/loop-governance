# Loop Governance Mobile — Design Consultation Output
**Date:** 2026-07-28
**Session:** mobile-01-design-consultation
**Input brief:** sessions/mobile-01-design-consultation.md
**Next session:** mobile-02-frontend-design

---

## Memorable Thing

> "My voice matters here."

Power feels real, not symbolic. When you delegate, you're moving actual governance weight, not clicking a like button. Every design decision below serves this.

---

## 1. User Journey Map

### Flow A: Chat (primary flow)

```
Open app
  └── Chat tab (default)
        └── Subject pill strip at top — active subject highlighted
              └── Dual-layer feed loads (see Interaction Model, §3)
                    └── User reads message from Gold-tier leader
                          └── Taps avatar
                                └── [Bottom sheet slides up]
                                      ├── Profile card: name, tier ring, power score, top subjects
                                      ├── Power tree preview (who delegated to them, who they delegate to)
                                      ├── CTA: "Delegate power in Economics"
                                      └── CTA: "Accredit as Economics expert"
```

**Entry points to delegation:** avatar tap from chat, name tap, power score tap.
All three go to the same bottom sheet. Consistency matters — users should feel the
path is always one tap from any message.

---

### Flow B: Delegate (second core flow)

```
Trigger: avatar tap in chat — OR — Power tab > "Find leaders"
  └── Bottom sheet: Profile card
        └── Tier ring (colour-coded), power score (monospace), subject breakdown
              └── "Delegate power in [current subject]" button
                    └── Confirmation screen (no modal — full screen slide)
                          ├── "You're passing your [X] governance points to [name] in [subject]"
                          ├── Impact preview: "This will move them from [tier] toward [next tier]"
                          ├── Confirm button
                          └── "Change subject" link (if user active in multiple subjects)
                                └── Subject picker — horizontal scrollable list
                                      └── Confirm → success toast: "[name]'s voice is now yours in [subject]"
```

**Key constraint:** delegation is per-subject. The UX must make this clear without
making it friction. The confirmation screen does the work — it names the subject
explicitly.

**Undo window:** 5-second toast with "Undo" (matches delegation mechanic in backend).

---

### Flow C: Accredit (third core flow)

```
Trigger: avatar tap in chat — OR — Power tab > user profile card
  └── Bottom sheet: Profile card
        └── "Accredit as expert in [current subject]" button
              └── If user active in multiple subjects: subject picker first
                    └── Confirm screen:
                          ├── "You're recognising [name] as a [subject] expert"
                          ├── "Your accreditation adds to their expert score, not their power score"
                          └── Confirm → success: "[name]'s expertise is on record"
```

**Why separate confirm text for accreditation:** delegation moves your power score;
accreditation adds expert credibility. Users need to know the difference at the
moment of action, not from a FAQ.

---

## 2. Information Architecture — 3-Tab Structure

### Tab 1: Chat (default)

```
Chat
├── Subject switcher (horizontal pill strip, sticky)
│     └── Governance | Economics | Ecology | Health | Technology | Education | Culture | Agriculture | Energy | Housing
├── Dual-layer feed (see §3)
│     ├── Leadership messages (above threshold) — elevated styling
│     └── Community messages — standard styling
├── "Leaders" filter toggle (top-right of header)
└── Composer (bottom, always visible)
```

**Subject switcher:** scroll-locked to first position on tab open. Active subject persists between sessions.

---

### Tab 2: Power

```
Power
├── Your power summary card (tier ring, score, rank in community)
├── Your delegation chain
│     ├── Delegated to: [name] in [subjects] → [their tier]
│     └── Delegating to you: [N] members → your power score breakdown
├── Accreditations
│     └── Subjects you're accredited in + who accredited you
├── Delegation actions
│     ├── Change delegation (per subject)
│     └── Revoke delegation
└── Discover leaders
      └── Ranked list: subject filter → leaders by power score
```

---

### Tab 3: Profile

```
Profile
├── Your tier badge (large, centred — the one place it's celebrated)
├── Your power score history (sparkline)
├── Recent activity (last 5 votes, messages, delegations)
├── Settings
└── More (overflow)
      ├── Proposals
      ├── Elections
      ├── Earnings
      ├── Campaigns
      ├── Map
      └── Badge page
```

**Overflow rationale:** these features are important but not daily-use. Profile is
the natural home because they relate to the user's civic identity, not real-time
community interaction.

---

## 3. Interaction Model — Dual-Layer Chat

**Core principle: one feed, not two screens.**

Every other governance forum splits leader and community into separate channels.
Loop's bet is that coexistence creates the social texture and aspiration that
makes delegation feel meaningful. A Bronze member sees a Diamond's message in the
same feed where their own message will appear. That adjacency is the point.

### How leadership and community messages coexist

**Leadership messages** (user's power score >= threshold for the active subject):

| Element | Treatment |
|---|---|
| Avatar ring | 2px solid in tier colour |
| Message background | Tier colour at 4% opacity (subconscious, not obvious) |
| Left border | 2px solid tier colour |
| Power score pill | Visible, monospace, tier colour text |
| Entrance animation | 200ms ease-out (vs 100ms for community) |

**Community messages** (below threshold):

| Element | Treatment |
|---|---|
| Avatar ring | 1px solid #2a2a2a (neutral, no tier signal) |
| Message background | #141414 (standard surface) |
| Left border | None |
| Power score pill | Hidden by default; tap avatar to see |
| Entrance animation | 100ms ease-out |

### The "Leaders" filter

A small pill toggle in the chat header: `All` / `Leaders`. Default: `All`.

- `Leaders` mode: hides community messages, shows only leadership-tier messages
  for the active subject. Good for following the inner circle's position.
- The toggle state resets on subject switch (intentional: each subject has a
  different leadership layer).

### Absence indicator

When the user scrolls through 2+ hours of chat with no leadership messages:

```
── No leadership activity in the past 2h ──
```

Thin divider, muted text. Keeps the leadership layer present even in its absence.
A community-only stretch doesn't feel like a bug; it feels like information.

### The power threshold

This is a backend config, not a design decision. But the design must accommodate:
- A subject where many users are above threshold (busy leadership layer)
- A subject where nobody is above threshold yet (empty leadership layer, but
  the tier rings on community messages still signal who's climbing)

The "No leadership activity" indicator covers the second case. The filter covers
the first.

---

## 4. Power Indicator Design Principles

**The rule: hierarchy motivates, never shames.**

Bronze users see the system clearly. They understand where they are and that the
path upward is through delegation and contribution, not purchase or invitation.

### Principle 1: Ring, not badge

The avatar ring is the sole tier indicator on a message. 2px, tier colour. No
text labels. No "Bronze", "Silver", "Gold" text on messages. The ring colour speaks.

Exception: the Profile tab, where the tier name appears once, large, in a celebratory
context. That's the only place the tier name is shown.

### Principle 2: Power score is small and monospace

Visible on leadership messages only. Positioned bottom-right of the avatar.
Font: JetBrains Mono. Colour: tier colour. Size: 11sp. This is data, not decoration.

On community messages: the score is hidden on the feed. Tap the avatar to see it
in the profile card. This means low-score users don't see their number next to every
message they write.

### Principle 3: Tint, not highlight

Leadership message backgrounds are tinted at 4% tier opacity. Not highlighted.
Not bordered prominently. A careful reader notices something is different; a
casual user just feels that leadership messages have slightly more presence.
The 2px left border is the readable signal. The tint is the felt signal.

### Principle 4: Promotion is the only animation moment

The tier system is not animated except at one moment: when a user's tier changes.
A single 600ms pulse radiates from the avatar ring. No other tier-related animation.
Chat messages pulse constantly enough without adding glow animations to every
leadership message.

### Principle 5: Diamond gets the shimmer, nobody else

Diamond tier avatar rings have a 3-second CSS shimmer loop (subtle, 15% opacity
shift). This is the only animated tier indicator in the steady state. It signals
"Diamond is different from everything else" without creating visual chaos.

### Colour usage summary

| Tier | Ring | Score pill | Msg bg tint | Leader msg border |
|---|---|---|---|---|
| Diamond | #b9f2ff shimmer | #b9f2ff | #b9f2ff 4% | #b9f2ff 2px |
| Platinum | #e5e4e2 | #e5e4e2 | #e5e4e2 4% | #e5e4e2 2px |
| Gold | #f59e0b | #f59e0b | #f59e0b 4% | #f59e0b 2px |
| Silver | #94a3b8 | #94a3b8 | none (below threshold) | none |
| Bronze | #cd7f32 | hidden | none | none |

Silver and Bronze are below the leadership threshold by default. Their ring colour
still appears on avatars — it signals tier without elevating the message.

---

## 5. Open Questions for Session 2 (Frontend Design)

These are design questions, not backend questions. They require decisions before
the component library can be built.

**Q1: Power threshold configuration**
Is the leadership threshold fixed per subject (e.g., always 80+ for Gold) or
configurable per community? The design assumes a single threshold per subject.
If it's community-configurable, the "Leaders" filter label needs to be dynamic:
"Leaders (80+)" or similar.

**Q2: Subject switcher on Chat tab**
10 subjects is a lot for a horizontal pill strip. Do all 10 appear at once (requires
scroll), or does the user curate their active subjects? Curation reduces clutter but
adds an onboarding step. Design needs to know before building the header component.

**Q3: Multi-subject delegation**
When a user has delegated in multiple subjects, how does tapping their avatar in
chat surface that? The bottom sheet currently shows "Delegate in [current subject]".
If they're already delegating to someone in two subjects, what does the UI show?
"Change delegation in Economics" vs "Delegate in Economics" are different states.

**Q4: Composer permissions**
Can Bronze-tier users reply directly to a leadership message (threaded reply) or
only post to the community feed? If threading exists, the composer needs a
"Replying to [name]" context strip.

**Q5: Leadership filter persistence**
Does the "Leaders" filter persist between app sessions, or always reset to "All"?
A power user might want it sticky. A new user should see "All" to understand
the community exists.

**Q6: Real-time power score updates**
Supabase Realtime is confirmed for chat messages. Should it also push power score
changes during a session? If yes, the avatar ring colour could change live during
a conversation. That's a remarkable UX moment (you watch someone's ring change
from Silver to Gold mid-discussion) but it adds complexity.

**Q7: Accreditation display on messages**
A user may be accredited in multiple subjects. On a chat message in the Economics
subject, does the accreditation badge show only the Economics accreditation, or all
of them? If all of them, the avatar area gets crowded.

**Q8: Onboarding for delegation**
A new user with no power score sees everyone's tier rings but can't yet understand
why they're different colours. Is there a first-session tooltip or overlay that
explains the tier system? If yes, when does it trigger? Design needs to
accommodate it in the chat screen layout.

---

## Design System Reference

Full token set is in DESIGN.mobile.md (same directory).

| Token | Value | Usage |
|---|---|---|
| Background | #0a0a0a | App background |
| Surface | #141414 | Cards, sheet backgrounds |
| Surface elevated | #1e1e1e | Dropdowns, bottom sheets |
| Text primary | #f5f5f5 | Body text, headings |
| Text muted | #71717a | Timestamps, metadata |
| Display font | Cabinet Grotesk | Screen titles, tab labels |
| Body/chat font | Geist | Chat messages, body copy |
| Data font | JetBrains Mono | Power scores, numbers |
| Base unit | 8px | All spacing |
| Border radius | 8px (messages), 12px (cards), 9999px (pills/avatars) | |

---

*Generated by /design-consultation — 2026-07-28*
*Next: sessions/mobile-02-frontend-design.md*
