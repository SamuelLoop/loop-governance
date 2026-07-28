# Loop Governance Mobile: brand application — 2026-07-28

## Run first

Read `sessions/mobile-frontend-design-output.md` (output from session 2).
Read `sessions/mobile-devex-checklist.md` (output from session 4).
Then invoke `/brand-loop` with the context below.

---

## Context

The Loop Governance mobile app needs brand assets and a token system applied
before implementation begins. The brand is Loop / Loop_cmbntr.

**Existing brand references on web:**
- Dark background: `#090909`
- Tier colours: Diamond `#b9f2ff`, Platinum `#e5e4e2`, Gold `#f59e0b`,
  Silver `#94a3b8`, Bronze `#cd7f32`
- Font: `system-ui` (web fallback stack)
- Badge page lives at `gov.loopcmbntr.live` — read it for visual reference

**What /brand-loop should produce for the mobile app:**

### 1. App icon and splash screen

- App icon: variants for iOS (1024x1024 no transparency), Android adaptive
  icon (foreground + background layers), and Expo icon config in `app.config.js`
- Splash screen: dark background (#090909), Loop wordmark or logomark centred,
  no tier colours on splash (keep neutral until user logs in and their tier is
  known)
- Source files: SVG masters saved to `apps/mobile/assets/brand/`

### 2. Design token file

A single `apps/mobile/src/theme/tokens.ts` file that the whole app imports:

```ts
export const colors = {
  bg: {
    primary: '#090909',
    elevated: '#111111',
    card: '#161616',
    overlay: 'rgba(0,0,0,0.72)',
  },
  tier: {
    diamond: '#b9f2ff',
    platinum: '#e5e4e2',
    gold:     '#f59e0b',
    silver:   '#94a3b8',
    bronze:   '#cd7f32',
  },
  text: {
    primary: 'rgba(235,235,235,0.92)',
    secondary: 'rgba(180,180,180,0.70)',
    muted: 'rgba(100,100,100,0.60)',
  },
  border: 'rgba(255,255,255,0.08)',
  success: '#22c55e',
  error:   '#ef4444',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
} as const;

export const radius = {
  sm: 6, md: 10, lg: 16, full: 9999,
} as const;

export const fontSize = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, hero: 34,
} as const;
```

Populate values based on the brand and the design output from session 2.
Challenge any value that does not read well on an OLED screen (high contrast,
true black preferred).

### 3. Typography

React Native does not support webfonts out of the box. Recommend one of:
- System font stack (SF Pro on iOS, Roboto on Android) — zero setup, always
  available, reads natively correct on each platform
- Expo Google Fonts (`expo-font` + `@expo-google-fonts/inter`) — single
  typeface across both platforms

Provide the `fontFamily` values for heading, body, mono (used for scores and
power numbers), and label (used for tier badges and caps).

### 4. Message bubble brand spec

The chat message bubble is the most-rendered component. Brand it specifically:

- Own message: right-aligned, background `colors.bg.elevated`, tier-coloured
  left border (2px)
- Leadership message (Gold+ sender): full-width, background with tier colour
  at 8% opacity, tier colour left border (3px), tier badge on username
- Community message (Bronze/Silver sender): standard bubble, no border, muted
  avatar ring
- System message (delegation event, accreditation event): centre-aligned,
  no bubble, tier colour text at 60% opacity

### 5. Tier badge component spec

Used on message bubbles, the Power screen, and the avatar bottom sheet:
- Shape: pill (border-radius: full)
- Background: tier colour at 10% opacity
- Border: tier colour at 30% opacity, 1px
- Text: tier colour, font-weight 700, font-size xs (11pt)
- Padding: 2px vertical, 7px horizontal
- Show on: all messages where sender is Silver or above; all user profile views

### 6. Power bar spec

The 12px strip at the top of the chat screen showing tier distribution:
- Each tier segment is proportional to its share of community members
- Segments are ordered Bronze (left) to Diamond (right)
- Rounded ends on the outermost segments only
- Animate width transitions over 600ms when the distribution changes
- Minimum segment width: 4px (so even 1 Diamond member is visible)

---

## Deliverable

`apps/mobile/src/theme/tokens.ts` — the token file, ready to import
`apps/mobile/assets/brand/` — SVG source files for icon and splash
`sessions/mobile-brand-output.md` — component specs in final form,
  ready to hand directly to the implementation session
