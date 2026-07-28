# Design System — Loop Governance Mobile
**Platform:** React Native (Expo) — iOS + Android
**Created:** 2026-07-28 by /design-consultation

---

## Product Context

- **What this is:** A civic governance app where citizens delegate power to leaders who vote on community proposals across ten subject domains
- **Who it's for:** Community members from Bronze newcomers to Diamond-tier leaders
- **Space/industry:** Civic tech, decentralised governance, community platforms
- **Project type:** React Native mobile app (shared Supabase backend with the web app at gov.loopcmbntr.live)
- **Memorable thing:** "My voice matters here" — power is real, not symbolic

---

## Aesthetic Direction

- **Direction:** Dark Civic — editorial gravity with tier metals as the only warm notes
- **Decoration level:** Intentional — tier colour glow on avatar rings and message left borders only. Everything else is type and space.
- **Mood:** Serious but alive. Not a government form. Not a crypto app. A civic journal where the power structures are visible and the hierarchy is earned.

The tier system's five colours ARE the colour system. No separate accent palette is needed.
The tier colours should feel like medals against the dark background — not UI chrome.

---

## Typography

- **Display/headings:** Cabinet Grotesk — editorial confidence, legible at any weight, distinctly not a tech or crypto font
- **Body/chat:** Geist — excellent mobile legibility, open-source, supports tabular-nums for power score alignment
- **Data/numbers:** JetBrains Mono — used exclusively for power scores, numeric stats, and timestamps where precision matters
- **Loading:** Google Fonts CDN (Cabinet Grotesk), Vercel/rsms (Geist), JetBrains (Mono)

### Scale (8sp base)

| Level | Font | Size | Weight | Usage |
|---|---|---|---|---|
| Display | Cabinet Grotesk | 28sp | 700 | Screen titles |
| Heading | Cabinet Grotesk | 20sp | 600 | Section headers, bottom sheet titles |
| Label | Cabinet Grotesk | 14sp | 500 | Tab labels, pill text, button labels |
| Body | Geist | 15sp | 400 | Chat messages, body copy |
| Caption | Geist | 12sp | 400 | Timestamps, metadata, secondary info |
| Data | JetBrains Mono | 11sp | 400 | Power scores, numeric values |

---

## Colour

- **Approach:** Restrained — the tier palette does all expressive work; neutral dark palette for everything else
- **Background:** `#0a0a0a` — near-black app background
- **Surface:** `#141414` — cards, sheet backgrounds, message bubbles
- **Surface elevated:** `#1e1e1e` — bottom sheets, dropdowns, modals
- **Border subtle:** `#2a2a2a` — dividers, non-tier borders
- **Text primary:** `#f5f5f5` — body text, headings, message content
- **Text muted:** `#71717a` — timestamps, metadata, placeholder text
- **Text disabled:** `#3f3f46` — inactive states

### Tier palette (the design system's accent layer)

| Tier | Hex | Usage |
|---|---|---|
| Diamond | `#b9f2ff` | Primary interactive colour (buttons, links), Diamond tier ring + border |
| Platinum | `#e5e4e2` | Platinum tier ring + border |
| Gold | `#f59e0b` | Gold tier ring + border |
| Silver | `#94a3b8` | Silver tier ring only (below leadership threshold) |
| Bronze | `#cd7f32` | Bronze tier ring only |

### Semantic colours

| State | Hex | Usage |
|---|---|---|
| Success | `#22c55e` | Delegation confirmed, accreditation confirmed |
| Warning | `#f59e0b` | (Gold tier doubles as warning — acceptable given context) |
| Error | `#ef4444` | Validation errors, failed actions |
| Info | `#b9f2ff` | (Diamond blue doubles as info — reinforces brand) |

### Dark mode

This app is dark-only. There is no light mode. The tier colour palette was designed
for dark backgrounds; on light backgrounds the metal colours lose their quality.

---

## Spacing

- **Base unit:** 8px
- **Density:** Comfortable (mobile chat standard — not compact, not spacious)

| Token | Value | Usage |
|---|---|---|
| spacing-xs | 4px | Tight internal padding (score pill padding) |
| spacing-sm | 8px | Message bubble internal padding (vertical) |
| spacing-md | 16px | Standard padding (screen edges, card padding) |
| spacing-lg | 24px | Section gaps |
| spacing-xl | 32px | Large gaps (bottom sheet sections) |
| spacing-2xl | 48px | Screen-level vertical rhythm |

---

## Layout

- **Approach:** Grid-disciplined — consistent 16px screen margins, no creative-editorial layout on mobile
- **Screen margins:** 16px left/right on all screens
- **Max chat message width:** 80% of screen width (same-side bubbles), full width for leadership messages
- **Bottom tab bar height:** 56px + safe area inset
- **Bottom sheet handle:** 32px drag handle, 24px from top of sheet

### Border radius

| Context | Value |
|---|---|
| Chat message bubbles | 16px (12px on sender-side bottom corner) |
| Cards (Power tab, bottom sheets) | 12px |
| Buttons | 8px |
| Pills (filter toggles, subject switcher) | 9999px |
| Avatars | 9999px (circles) |

---

## Motion

- **Approach:** Intentional — motion carries meaning, not decoration
- **Easing:** enter `ease-out` / exit `ease-in` / transition `ease-in-out`

| Event | Duration | Notes |
|---|---|---|
| Community message entrance | 100ms ease-out | Fast, feels live |
| Leadership message entrance | 200ms ease-out | Slightly heavier, carries weight |
| Bottom sheet open | 280ms ease-out | Standard mobile sheet |
| Bottom sheet close | 200ms ease-in | |
| Tier promotion pulse | 600ms (single pulse) | Radiates from avatar ring outward |
| Diamond shimmer loop | 3000ms (repeating) | 15% opacity shift on ring |
| Subject switcher scroll | Native momentum | No override |
| Tab switch | 180ms fade | No slide — subjects are parallel, not sequential |

**Animation rules:**
- The tier promotion pulse is the only moment in the app with radial animation
- The Diamond shimmer is the only steady-state looping animation
- No skeleton screens on chat (Supabase Realtime push — messages arrive live)

---

## Avatar Ring System

The avatar ring is the tier's single indicator on a message. No text labels on messages.

| Tier | Ring style | Ring colour | Score pill |
|---|---|---|---|
| Diamond | 2px solid + shimmer loop | `#b9f2ff` | Visible, `#b9f2ff` text |
| Platinum | 2px solid | `#e5e4e2` | Visible, `#e5e4e2` text |
| Gold | 2px solid | `#f59e0b` | Visible, `#f59e0b` text |
| Silver | 1px solid | `#94a3b8` | Hidden in feed; visible in profile sheet |
| Bronze | 1px solid | `#cd7f32` | Hidden in feed; visible in profile sheet |

Score pill: 11sp JetBrains Mono, positioned bottom-right of avatar, tier colour.

---

## Leadership Message Treatment

Applied to messages where sender's power score >= leadership threshold for the active subject.

```
┌─ 2px left border (tier colour) ──────────────────────────────┐
│                                                               │
│  [avatar ring]  Name                     [score pill]         │
│                 Message text goes here...                     │
│                                                    12:34      │
│                                                               │
└─ Background: tier colour at 4% opacity ───────────────────────┘
```

Community messages: no left border, standard `#141414` background, no score pill visible.

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-28 | Dark Civic aesthetic | Tier colours need dark backgrounds to read as metals, not noise |
| 2026-07-28 | Cabinet Grotesk for display | Editorial confidence; distinguishes Loop from crypto/tech competitors |
| 2026-07-28 | Geist for chat body | Mobile legibility + tabular-nums support for power scores |
| 2026-07-28 | Single feed dual-layer | Coexistence creates aspiration; separate screens break social texture |
| 2026-07-28 | Ring, not badge | Less intrusive; colour speaks without labelling Bronze as "Bronze" |
| 2026-07-28 | No light mode | Tier palette designed for dark; split support adds cost without benefit |
| 2026-07-28 | Diamond blue as primary interactive colour | Unifies brand accent with top tier; every CTA button carries tier aspiration |
