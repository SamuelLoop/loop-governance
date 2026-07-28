# Loop Governance Mobile — Frontend Design Output
**Date:** 2026-07-28
**Session:** mobile-02-frontend-design
**Design system:** DESIGN.mobile.md
**Follows:** mobile-design-consultation-output.md
**Next session:** mobile-03-eng-plan.md

---

## Open Question Decisions

Binding decisions for session 3. All 8 from session 1 are resolved below.

| # | Question | Decision | Rationale |
|---|---|---|---|
| Q1 | Fixed or configurable threshold? | Fixed per subject for v1. If made configurable later, filter label becomes "Leaders (80+)" | Avoids surfacing threshold complexity at launch |
| Q2 | 10 subjects in switcher? | User curates up to 5 active subjects; overflow shows "+N" pill. Onboarding step: pick your subjects on first launch. Default: Governance + 2 community picks. | 10 pills scroll poorly at 375pt; curation makes subject selection feel intentional, not exhausting |
| Q3 | Multi-subject delegation in bottom sheet? | CTA is state-aware per current subject: "Delegate in Governance" / "Change delegate in Governance". Tap the subject score breakdown to see all-subject delegation state. | One clear primary action per context; full picture is one drill-down tap away |
| Q4 | Composer permissions? | All tiers can post to the feed. Threaded reply shows "Replying to [name]" strip above composer. Long-press send (500ms) reveals broadcast mode to Gold+ only; Bronze/Silver never see it. Backend enforces permissions silently. | Less friction for newcomers joining conversation |
| Q5 | Leaders filter persistence? | Resets to "All" on app launch and on subject switch. Persists during the session (navigate away and back keeps state). | New users always land on "All"; power users get session-level persistence without a sticky confused state |
| Q6 | Real-time power score updates? | Yes via Supabase Realtime. Ring colour updates live with no animation. Tier promotion (rank change) triggers the 600ms pulse. Score-only changes: immediate, silent. | Live ring changes mid-conversation are a remarkable UX moment; no animation for score-only keeps noise low |
| Q7 | Accreditation display on messages? | Show current-subject accreditation as a small checkmark badge overlaid on the avatar (bottom-right, 14pt). All accreditations visible in bottom sheet. | Avatar area is too small for multiple subject badges at 40pt |
| Q8 | Onboarding for delegation? | Single coachmark, triggered 1500ms after the first leadership message appears on a new user's first session. Anchored to that message's avatar ring. "Ring colour = governance power. Tap to delegate." Auto-dismisses on any tap. Shown once, never again. | Contextual at the moment of relevance; non-blocking; no overlay required |

---

## Screen 1: Community Chat

### Annotated layout (375pt — iPhone SE, tightest supported width)

```
┌────────────────────────────────────────┐  ← safe-area-top (varies by device)
│ 9:41                    ◉ ◉ ▐▌ ██     │  status bar (system-managed)
├────────────────────────────────────────┤
│ Community                [All  Leaders]│  Header 56pt: Cabinet Grotesk 20/600 + Leaders toggle right
├────────────────────────────────────────┤
│ ◼ Governance  Economics  Ecology  +2   │  Subject switcher: scrollable pills, 44pt tap targets
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  1px divider #2a2a2a
│▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░▫▫▫▫▫│  Power bar 12pt: Bronze→Silver→Gold→Platinum→Diamond
├────────────────────────────────────────┤
│                          ↕ chat feed   │
│ ╔══════════════════════════════════════╗│  ← Leadership message (Gold tier)
│ ║[◎ Gold 847] Sarah Mitchell   [847]  ║│    Gold ring: #f59e0b 2px
│ ║ The infrastructure vote deserves    ║│    Bg tint: #f59e0b at 4% opacity
│ ║ broader input from eastern areas    ║│    Left border: #f59e0b 2px
│ ║                            14:23    ║│    Score pill: 847, JetBrains Mono 11sp
│ ╚══════════════════════════════════════╝│
│                                        │
│ [◎ Silver] Alex K.                     │  Community message: no border, no score pill
│            Eastern sub-committee met   │  Silver ring: #94a3b8 1px
│            last week — docs linked     │  Bg: #141414 standard
│                              14:24     │
│                                        │
│  ────── No leadership activity ──────  │  Absence indicator: 2h+ gap, 11sp Geist #3f3f46
│                                        │
│ [◎ Bronze] Jamie L.                    │  Bronze ring: #cd7f32 1px
│             Has anyone read the        │
│             Meridian report?           │
│                              14:31     │
│                                        │
├────────────────────────────────────────┤
│  Message...                      [▲]   │  Composer: 52pt min, expands, send btn #b9f2ff bg
├────────────────────────────────────────┤
│  💬 Chat      ⚡ Power    ◎ Profile   │  Tab bar 56pt + safe-area-bottom
└────────────────────────────────────────┘
```

### Element annotation

| Element | Value | Note |
|---|---|---|
| Header | 56pt, Cabinet Grotesk 20/600 | Title left-aligned; Leaders toggle right-aligned |
| Leaders toggle | 28pt pill, two-state | Active state: `#b9f2ff 15%` fill on active half, `#b9f2ff` text. Resets on subject switch. |
| Subject pills | 32pt height, 9999px radius | Active: `#b9f2ff 10%` bg + `#b9f2ff` border + `#b9f2ff` text. Inactive: `#2a2a2a` border + `#71717a` text. |
| Overflow pill | "+2" same style as inactive | Opens subject selection sheet; tap adds subject |
| Power bar | 12pt, full bleed | Five segments: proportional widths from live tier counts. Long-press reveals floating percentage labels. Animates on distribution change (300ms). |
| Leadership message | Full width within 16pt margins | Left border 2px, bg tint 4%, score pill bottom-right of avatar. 200ms entrance. |
| Community message | Standard | No left border. Score pill hidden; visible in bottom sheet. 100ms entrance. |
| Own message | Right-aligned, 80% max-width | `#1e1e1e` bg (slightly elevated). No avatar. No ring. |
| Absence indicator | Centered, full width | 0.5px lines either side, 11sp Geist `#3f3f46`. Vertical margin 24pt. |
| Composer | 52pt min | Long-press send (500ms): Gold+ only, reveals BroadcastSheet. |
| Avatar tap target | 48pt (40pt avatar + 4pt margin) | Opens bottom sheet. Anywhere on avatar ring + image triggers it. |

---

## Screen 2: Power

### Annotated layout

```
┌────────────────────────────────────────┐
│ 9:41                    ◉ ◉ ▐▌ ██     │
├────────────────────────────────────────┤
│ Power                                  │  Header (title only — no filter)
├────────────────────────────────────────┤
│                  ↕ scrollable          │
│ ┌──────────────────────────────────┐   │
│ │  [◎ Gold 52pt]  Samuel Barlow   │   │  My Power Card: #141414 bg, 12px radius
│ │  GOLD TIER               #23    │   │  Tier name: 12sp Cabinet Grotesk 500 uppercase
│ │  ████████████░░░  847 pts        │   │  Progress bar: Gold fill, #2a2a2a track, 4pt height
│ │  Governance · Economics          │   │  Active subjects in Geist 12sp #71717a
│ └──────────────────────────────────┘   │
│                                        │
│ DELEGATIONS                            │  Section label: 10sp Cabinet Grotesk 600 uppercase #71717a
│ ┌──────────────────────────────────┐   │
│ │ → Sarah M.        Governance  ◉ │   │  Outgoing delegation row (swipe left = Revoke)
│ └──────────────────────────────────┘   │  Revoke: #ef4444 bg, 80pt wide
│ Delegating to you (14)            ▸   │  Collapsed; tap expands
│ ┌──────────────────────────────────┐   │
│ │ ← Alex K.   Economics            │   │  Incoming: first 2 shown, +N more collapsed
│ │ ← Jamie L.  Governance    +12   │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ACCREDITATIONS                         │
│ ┌──────────────────────────────────┐   │
│ │ Economics expert          ×3     │   │  Accreditation rows
│ │ Governance                ×1     │   │
│ └──────────────────────────────────┘   │
│                                        │
├────────────────────────────────────────┤  sticky footer
│ [          + Give Power           ]    │  #b9f2ff bg, #0a0a0a text, 8px radius, full width
├────────────────────────────────────────┤
│  💬 Chat      ⚡ Power    ◎ Profile   │
└────────────────────────────────────────┘
```

### Element annotation

| Element | Value | Note |
|---|---|---|
| My Power Card | 12px radius, 16pt padding | Ring is 3px on card (wider than feed's 2px) to emphasise at larger size |
| Progress bar | 4pt height | Shows position within current tier range (not absolute score). Gold fill. |
| Outgoing delegation | Swipe-left reveals Revoke | `#ef4444` swipe action. 56pt row height. |
| Incoming count | Collapsed by default | "Delegating to you (14)" tappable row; expands to scrollable list |
| Give Power CTA | Sticky, above tab bar | Opens search flow. Search-first is the discovery UX. No separate "Discover leaders" list. |

### Give Power flow (two-step sheet)

Step 1 — Search:
- Full-screen sheet, `TextInput` autofocused
- Results: DelegationRow variant sorted by power score in current subject
- Subject filter pills above results; default = current subject

Step 2 — Confirm:
- Full-screen slide-right (navigation push, not modal)
- "You're passing your governance weight to [name]" — Cabinet Grotesk 20sp
- Impact line: "This will move them toward [next tier]" — Geist 14sp `#71717a`
- Primary confirm: `#b9f2ff` bg, full width
- "Change subject" text link below confirm

---

## Screen 3: Profile + Settings

### Annotated layout

```
┌────────────────────────────────────────┐
│ 9:41                    ◉ ◉ ▐▌ ██     │
├────────────────────────────────────────┤
│ Profile                                │
├────────────────────────────────────────┤
│                 ↕ scrollable           │
│                                        │
│           [◎◎◎ 72pt Gold ring ◎◎◎]    │  Large centered avatar — 72pt, 4px ring
│             Samuel Barlow              │  Cabinet Grotesk 20/600
│             GOLD TIER                  │  Cabinet Grotesk 14/500, #f59e0b
│             847 governance points      │  JetBrains Mono 13sp, #f5f5f5
│                                        │
│     ╌╌╌╌╌╌▁▁▂▃▂▃▄▄▅▅▆▆▇╌╌╌╌╌╌        │  Sparkline: 48pt height, #b9f2ff 1px stroke
│                                        │  Fill: #b9f2ff at 10%. No axes, no labels.
│────────────────────────────────────────│  divider #2a2a2a
│ ACCOUNT                                │  Section label
│ Notification preferences            ›  │  Settings rows: 56pt tap height, Geist 14sp
│ Subjects I follow                   ›  │
│ Privacy & data                      ›  │
│────────────────────────────────────────│
│ MORE                                   │
│ Proposals                           ›  │
│ Elections                           ›  │
│ Earnings                            ›  │
│ Campaigns                           ›  │
│ Map                                 ›  │
│ My badge                            ›  │
│────────────────────────────────────────│
│ Sign out                               │  Geist 14sp, #71717a — not red (not dangerous)
│────────────────────────────────────────│
│  💬 Chat      ⚡ Power    ◎ Profile   │
└────────────────────────────────────────┘
```

### Element annotation

| Element | Value | Note |
|---|---|---|
| Avatar | 72pt, 4px ring | Only place user sees their tier celebrated at full scale. Ring is widest in the app. |
| Tier name | Cabinet Grotesk 14/500, tier colour | The only screen where tier name is spelled out in text. |
| Score | JetBrains Mono 13sp | Shows points as a number, not a progress bar. |
| Sparkline | 48pt height, 30-day window | `#b9f2ff` stroke (Diamond blue as neutral accent). Y-axis relative change only. No labels. `<3` data points: flat line + "Not enough data yet" caption. |
| Settings rows | 56pt tap target | All navigate to full screens; no modals for settings. |
| Sign out | `#71717a` text, bottom of list | Deliberate: signing out is not destructive; red would misrepresent. |

---

## Bottom Sheet: User Profile

Triggered by tapping any avatar anywhere in the app.

### Layout

```
                    ┌─────────────────────────┐
                    │         ─────           │  drag handle: 32×4pt, #3f3f46, 12pt from top
                    │                         │
                    │  [◎ Gold 56pt]           │
                    │  Sarah Mitchell          │  Cabinet Grotesk 18/600
                    │  Gold · 847 pts          │  Geist 13sp #71717a · JetBrains Mono 13sp
                    │─────────────────────────│
                    │ SUBJECTS                 │
                    │ Governance ████████░ 62% │  Bar rows: Geist 12sp label, 4pt bar, JetBrains Mono pct
                    │ Economics  █████░░░░ 38% │
                    │─────────────────────────│
                    │ POWER TREE               │
                    │   ● ● ● ●               │  upstream delegators
                    │     ╲ ╲│╱ ╱             │
                    │      [Sarah]             │  center node
                    │       │╲╲               │
                    │       ● ● ●             │  downstream delegates
                    │  12 upstream · 3 down    │  JetBrains Mono 10sp #71717a
                    │─────────────────────────│
                    │ [  Delegate  ][Accredit] │  split buttons: primary + outlined
                    └─────────────────────────┘
```

### Bottom sheet CTA states

| State | Delegate button | Accredit button |
|---|---|---|
| Not delegated to this person | "Delegate in [subject]" (primary) | "Accredit" (outlined) |
| Already delegating to this person | "Change delegation" (primary) | "Accredit" (outlined) |
| Already accredited this person in subject | "Delegate in [subject]" | "Accredited ✓" (disabled) |
| Own profile | (not shown) | (not shown) |

---

## Component Inventory

### 1. MessageBubble

**Variants:** `leadership` / `community` / `own`

| Property | leadership | community | own |
|---|---|---|---|
| Alignment | Left | Left | Right |
| Width | Full (within 16pt margins) | Full | Max 80% |
| Background | Tier colour at 4% | `#141414` | `#1e1e1e` |
| Left border | 2px, tier colour | None | None |
| AvatarRing | Shown (tier-coloured) | Shown (tier-coloured) | Not shown |
| ScorePill | Visible | Hidden | Not shown |
| Entrance | 200ms ease-out | 100ms ease-out | 100ms |

**Long-press state:** `#2a2a2a` bg highlight on any variant. Shows timestamp if hidden.

---

### 2. AvatarRing

**Sizes:** 40pt (feed) / 48pt (Power card) / 56pt (bottom sheet) / 72pt (Profile)

| Tier | Ring width | Colour | Steady-state animation |
|---|---|---|---|
| Diamond | 2px | `#b9f2ff` | 3000ms shimmer loop (opacity 1.0→0.7→1.0) |
| Platinum | 2px | `#e5e4e2` | None |
| Gold | 2px | `#f59e0b` | None |
| Silver | 1px | `#94a3b8` | None |
| Bronze | 1px | `#cd7f32` | None |

**Promotion animation:** 600ms single pulse. Ring scale `1.0→1.4→1.0`. Outer glow (tier colour) opacity `0.6→0`. Haptic: medium impact. Triggers on Realtime `tier_changed` event.

**Accreditation badge:** 14pt circle, tier colour bg, white `✓`, bottom-right of avatar. Visible only if user is accredited in current subject.

---

### 3. PowerBar

Height: 12px (structural, not `sp`). Full screen bleed (no horizontal margin).

| Segment | Colour | Width |
|---|---|---|
| Bronze | `#cd7f32` | `bronzePct%` |
| Silver | `#94a3b8` | `silverPct%` |
| Gold | `#f59e0b` | `goldPct%` |
| Platinum | `#e5e4e2` | `platPct%` |
| Diamond | `#b9f2ff` | `diamPct%` |

Long-press: floating tooltip per segment showing "%". Width updates animate 300ms ease-in-out on distribution change.

---

### 4. SubjectPill

Height: 32pt. Padding: 14pt horizontal. Radius: 9999px. Border: 1pt.

| State | Background | Border | Text |
|---|---|---|---|
| Active | `#b9f2ff` at 10% | `#b9f2ff` | `#b9f2ff` |
| Inactive | Transparent | `#2a2a2a` | `#71717a` |
| Overflow (+N) | Transparent | `#2a2a2a` | `#71717a` |
| Pressed | `#b9f2ff` at 5% | `#2a2a2a` | `#71717a` |

Activate: 150ms crossfade (no slide, no underline indicator). Font: Cabinet Grotesk 13/500.

---

### 5. LeadersToggle

Two-state pill. Height: 28pt. Width: ~120pt. Radius: 9999px. Border: 1pt `#2a2a2a`.

| State | "All" half | "Leaders" half |
|---|---|---|
| All (default) | `#b9f2ff` text, `#b9f2ff 15%` bg | `#71717a` text |
| Leaders | `#71717a` text | `#b9f2ff` text, `#b9f2ff 15%` bg |

Transition: 120ms crossfade. Resets on subject switch.

---

### 6. PowerCard

Surface: `#141414`, 12px radius, 16pt padding.

- Avatar: 48pt, ring 3pt (wider than feed for card context)
- Name: Cabinet Grotesk 16/600, `#f5f5f5`
- Tier label: Cabinet Grotesk 12/500 uppercase, tier colour
- Rank: Geist 13sp `#71717a`, right-aligned on tier row
- Score: JetBrains Mono 15/500, `#f5f5f5`
- Progress bar: 4pt height, tier colour fill, `#2a2a2a` track. Width = position within tier range.

---

### 7. DelegationRow

Height: 56pt. Layout: [direction arrow 16pt] [avatar 32pt] [name + subject] [tier pill].

- Direction arrow: `→` outgoing (`#b9f2ff`), `←` incoming (`#71717a`)
- Swipe-left on outgoing: Revoke action, `#ef4444` bg, 80pt, reveals at 50% threshold
- Tier pill: 9999px radius, 1pt border in tier colour, tier colour text, Cabinet Grotesk 10/500 uppercase

---

### 8. BottomSheet

Surface: `#1e1e1e`, 20px top radius. Border-top: 1px `#2a2a2a` (no drop shadow on dark).
Drag handle: 32×4pt, `#3f3f46`, centred, 12pt from top.
Open: translateY `100%→0`, 280ms ease-out. Close: translateY `0→100%`, 200ms ease-in.
Scrim: `rgba(0,0,0,0.7)`, fades with sheet.

---

### 9. AbsenceIndicator

Appears in timeline after `≥2hr` gap in leadership messages.

Layout: `[0.5px #2a2a2a line] [text] [0.5px #2a2a2a line]`
Text: "No leadership activity in the past 2h" — Geist 11sp, `#3f3f46`
Vertical margin: 24pt top and bottom.

---

### 10. Composer

Min height: 52pt. Expands to 120pt. Radius: 24pt (pill shape). Bg: `#141414`.
Placeholder: Geist 15sp, `#3f3f46`.
Send button: 36pt circle, `#b9f2ff` bg, `#0a0a0a` arrow icon.
Long-press send (500ms, Gold+ only): BroadcastSheet slides up with "Broadcast to all" CTA. Not rendered in DOM for Bronze/Silver.

---

### 11. TierBadge (Profile tab only)

Avatar: 72pt, ring 4pt. Only placement where ring width is 4pt.
Name: Cabinet Grotesk 20/600, `#f5f5f5`, 8pt below avatar.
Tier: Cabinet Grotesk 14/500 uppercase, tier colour, 4pt below name.
Score: JetBrains Mono 13sp, `#f5f5f5`, 4pt below tier.

---

### 12. Sparkline

Height: 48pt, full width within 16pt margins.
SVG `<Path>` with cubic bezier, `react-native-svg`.
Stroke: 1pt, `#b9f2ff`. Area fill: `#b9f2ff` at 10%.
30-day window; no axes, no labels, no gridlines.
Edge case `<3` data points: flat line + Geist 11sp `#71717a` caption "Not enough data yet".
Endpoint: 3pt filled circle `#b9f2ff`.

---

### 13. SettingsRow

Height: 56pt. Label: Geist 14sp `#f5f5f5`. Chevron: `#71717a` 14sp. Pressed: `#1e1e1e` bg.
Section label: Cabinet Grotesk 10/600 uppercase, `#71717a`, letter-spacing 2pt. Padding-top 24pt, padding-bottom 8pt.

---

## Motion Brief

### 1. Tier promotion pulse — 600ms, once

The emotional peak of the app. Fires on `tier_changed` Realtime event.

- Ring: `scale(1.0) → scale(1.4) → scale(1.0)`, `Animated.sequence`, spring config
- Outer glow: opacity `0.6 → 0`, radius expands to 2.5× ring size
- All instances of that user's avatar pulse simultaneously
- Haptic: medium impact (iOS `UIImpactFeedbackGenerator`, Android `EFFECT_CLICK`)
- Sound: none (civic, not gamified)

---

### 2. Diamond shimmer — 3000ms loop, always on

The only steady-state animation. Differentiates Diamond from everything else.

```
Animated.loop(
  Animated.sequence([
    Animated.timing(shimmerAnim, { toValue: 0.7, duration: 1500, easing: Easing.inOut(Easing.ease) }),
    Animated.timing(shimmerAnim, { toValue: 1.0, duration: 1500, easing: Easing.inOut(Easing.ease) }),
  ])
)
```

Applied to ring border opacity. Also adds `box-shadow` pulse: `0 0 8px rgba(185, 242, 255, 0.4)` at opacity peak.

---

### 3. Power bar update — 300ms, ease-in-out

When tier distribution shifts (delegation changes tier counts), segments reanimate widths.
`Animated.timing` on each segment's `flex` prop, 300ms.
Purpose: the bar is a live instrument, not a snapshot.

---

### 4. Message entrances — 100ms (community) / 200ms (leadership)

Both: `translateY: 12 → 0` + `opacity: 0 → 1` together.
The 100ms difference is felt as weight, not consciously read as a difference.

---

### 5. Bottom sheet — 280ms open, 200ms close

Open: `spring({ damping: 20, stiffness: 300 })` on translateY if using Reanimated 3. Otherwise timing 280ms ease-out.
Scrim fades in at same duration as open.

---

### 6. Delegation confirmation glow — ~400ms

On delegate confirm: radial glow expands from confirm button (`#b9f2ff`, opacity `0.5→0`, radius `0→60pt`), then toast slides up from bottom.
Toast: "[Name]'s voice is now yours in [subject]". 5-second undo window.
Second most important moment in the app after tier promotion.

---

### 7. First-session coachmark — delay 1500ms, auto-dismiss

Appears 1500ms after first leadership message renders for a new user.
Tooltip anchored to that message's avatar ring: "Ring colour = governance power. Tap to delegate."
Fade in 300ms. Tapping anywhere dismisses (200ms fade out). Never shown again (persist flag in AsyncStorage).

---

### 8. Reduced-motion compliance

All motion respects `AccessibilityInfo.isReduceMotionEnabled()`. When true:
- Replace all entrance animations with instant renders
- Replace tier promotion pulse with a 200ms flash only (opacity `0.5→1`)
- Diamond shimmer: freeze at full opacity (still, no loop)
- Bottom sheet: 150ms snap instead of spring

---

## Responsive Notes

### Width breakpoints

| Device | Screen width | Adjustment |
|---|---|---|
| iPhone SE 3rd gen | 375pt | Minimum supported. Pills may require scroll. Power bar still full bleed. |
| iPhone 14 (design base) | 390pt | All wireframes drawn at this width. |
| iPhone 14 Pro Max | 430pt | Increase screen margin to 18pt. Max message width stays 80%. |
| Android (common range) | 360–412dp | Same treatment as 375–430pt. RN `dp` = `pt` for layout purposes. |

No tablet layout in v1. `useWindowDimensions()` adjusts spacing, not structure.

### Height considerations

| Condition | Handling |
|---|---|
| iPhone SE (667pt height) | Chat feed height reduces. Composer + tab bar stay fixed. Feed scrolls. |
| Dynamic Island (iPhone 14 Pro+) | `SafeAreaView` from `react-native-safe-area-context` handles top inset automatically |
| Android soft keyboard | `KeyboardAvoidingView` with `behavior="padding"` on chat screen |
| Foldable (unfolded) | Not targeted for v1 — treat as wide phone |

### Font scaling

All `Text` elements use `allowFontScaling={true}` (default). Exception: `ScorePill` uses `allowFontScaling={false}` because at large text scales the pill layout breaks. Compensate by increasing pill container height at `fontScale > 1.3`.

### Safe areas

All screens: `SafeAreaView` from `react-native-safe-area-context`. Tab bar includes `useSafeAreaInsets().bottom`. Chat feed `contentInsetAdjustmentBehavior` handles scroll indicators.

---

## Handoff Spec

### Colour tokens

```ts
// tokens/colors.ts
export const colors = {
  // Backgrounds
  bgApp:         '#0a0a0a',
  bgSurface:     '#141414',
  bgElevated:    '#1e1e1e',
  bgDisabled:    '#27272a',

  // Borders
  borderSubtle:  '#2a2a2a',
  borderMuted:   '#3f3f46',

  // Text
  textPrimary:   '#f5f5f5',
  textMuted:     '#71717a',
  textDisabled:  '#3f3f46',

  // Semantic
  success:       '#22c55e',
  error:         '#ef4444',

  // Tier
  diamond:       '#b9f2ff',
  platinum:      '#e5e4e2',
  gold:          '#f59e0b',
  silver:        '#94a3b8',
  bronze:        '#cd7f32',
} as const;

// Primary interactive colour = Diamond blue
export const primary = colors.diamond;

export type Tier = 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze';
export const tierColor: Record<Tier, string> = {
  diamond:  colors.diamond,
  platinum: colors.platinum,
  gold:     colors.gold,
  silver:   colors.silver,
  bronze:   colors.bronze,
};

// Tier ring width: Gold+ = 2px, Silver/Bronze = 1px
export const tierRingWidth: Record<Tier, number> = {
  diamond:  2, platinum: 2, gold: 2, silver: 1, bronze: 1,
};
```

### Spacing tokens

```ts
// tokens/spacing.ts
export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const screenPadding = 16; // horizontal margin, all screens
```

### Typography tokens

```ts
// tokens/typography.ts
// Fonts loaded via expo-font in _layout.tsx
export const fonts = {
  display:       'CabinetGrotesk-Bold',
  displayMedium: 'CabinetGrotesk-Medium',
  body:          'Geist-Regular',
  bodyMedium:    'Geist-Medium',
  data:          'JetBrainsMono-Regular',
} as const;

export const textStyles = {
  display:  { fontFamily: fonts.display,        fontSize: 28, lineHeight: 36 },
  heading:  { fontFamily: fonts.displayMedium,  fontSize: 20, lineHeight: 28 },
  label:    { fontFamily: fonts.displayMedium,  fontSize: 14, lineHeight: 20 },
  body:     { fontFamily: fonts.body,           fontSize: 15, lineHeight: 22 },
  caption:  { fontFamily: fonts.body,           fontSize: 12, lineHeight: 18 },
  data:     { fontFamily: fonts.data,           fontSize: 11, lineHeight: 16 },
} as const;
```

### Border radius tokens

```ts
// tokens/radius.ts
export const radius = {
  message: 16,  // chat bubble
  card:    12,  // Power card, bottom sheet
  button:   8,  // CTA buttons
  pill:  9999,  // subject pills, toggles
  avatar: 9999, // circles
} as const;
```

### Elevation model

Dark app: no drop shadows. Elevation via background colour contrast.

```ts
// tokens/elevation.ts
// Use these backgroundColor values instead of shadow props
export const elevation = {
  app:      '#0a0a0a', // base
  surface:  '#141414', // cards
  elevated: '#1e1e1e', // sheets, dropdowns
} as const;
// Border where elevation is ambiguous: 1px #2a2a2a
```

### Component state matrix

| Component | Default | Pressed | Disabled | Active |
|---|---|---|---|---|
| Button (primary) | `#b9f2ff` bg, `#0a0a0a` text | `opacity: 0.85` | `#27272a` bg, `#3f3f46` text | — |
| Button (outlined) | `#1e1e1e` bg, `#b9f2ff` border+text | `opacity: 0.85` | `#27272a` bg, `#3f3f46` border+text | — |
| SubjectPill | transparent bg, `#2a2a2a` border, `#71717a` text | `#b9f2ff 5%` bg | — | `#b9f2ff 10%` bg, `#b9f2ff` border+text |
| LeadersToggle | active half `#b9f2ff 15%` bg + `#b9f2ff` text | — | — | Per half |
| SettingsRow | transparent | `#1e1e1e` bg | `#71717a` text | — |
| DelegationRow | transparent | `#141414` bg | — | — |
| Tab item | `#71717a` icon+label | — | — | `#b9f2ff` icon+label |

### Asset requirements

| Asset | Format | Notes |
|---|---|---|
| Avatar placeholder | Generated from initials | `#1e1e1e` bg, `#f5f5f5` initials, Cabinet Grotesk Bold, no external image needed |
| Tab icons | SVG (Expo MaterialCommunityIcons or custom) | Chat: `message-text-outline` / Power: `lightning-bolt` / Profile: `account-circle-outline` |
| Chevron | `›` or SF Symbol `chevron.right` | 14sp, `#71717a` |
| Mini power tree | Generated SVG at runtime | Upstream nodes → person → downstream; use `react-native-svg` `Circle` + `Line` elements |
| Diamond shimmer | Pure `Animated` API | No Lottie needed |
| Tier promotion glow | Pure `Animated` API | Radial expand via `scale` + `opacity` |

---

*Generated by /frontend-design — 2026-07-28*
*Visual mockup: sessions/mobile-frontend-design-output.html (artifact)*
*Next session: mobile-03-eng-plan.md*
