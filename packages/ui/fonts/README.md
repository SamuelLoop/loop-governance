# Self-hosted fonts — Loop Governance Web

Sourced and licence-verified 2026-08-10 (session `web-06-brand.md`). Loaded
via `next/font/local` per app (eng-plan decision 11) — these files are the
single source of truth; do not re-download elsewhere.

Only the weights `DESIGN.web.md`'s type scale actually uses are vendored —
not full family sets — to keep the shipped bundle lean.

| Family | File | Weight | Used for |
|---|---|---|---|
| General Sans | `general-sans/GeneralSans-Bold.woff2` | 700 (Bold) | Display, H1, H2 — see correction note below |
| Geist | `geist/Geist-Regular.woff2` | 400 (Regular) | Body, Caption |
| JetBrains Mono | `jetbrains-mono/JetBrainsMono-Medium.woff2` | 500 (Medium) | Data-sm |
| JetBrains Mono | `jetbrains-mono/JetBrainsMono-Bold.woff2` | 700 (Bold) | Data-lg |

**Correction to `DESIGN.web.md`:** Display was specced at weight 800.
General Sans's actual released family (verified against the downloaded
variable font's `fvar` axis: `wght` range is 200–700) has no 800/Extrabold
instance — Bold (700) is the heaviest weight that exists. Display now
shares 700 with H1; they stay visually distinct via the 32px/22px size
difference. Do not request `font-weight: 800` for General Sans — browsers
synthetically embolden it inconsistently (Chrome fakes a bolder stroke,
other engines sometimes don't), which reads as a rendering bug, not a
design choice.

## Licensing

| Family | License | Self-hosting on our own site | Source |
|---|---|---|---|
| General Sans | ITF Free Font License (Fontshare EULA), full text at `general-sans/LICENSE.txt` | Yes — personal and commercial use permitted, no charge, no attribution required. The EULA's one relevant restriction (§02) bars using legacy *font-replacement* delivery technologies ("EOT, Cufon, sIFR or similar") without permission — this does not cover standard `@font-face`/`next/font/local` embedding, which is exactly what Fontshare's own downloadable "WEB" package (WOFF2 + CSS) is built for. Redistributing/reselling the font files themselves, or modifying and redistributing under a new name, is not permitted — irrelevant here since we're only embedding, not redistributing the font as a product. | `api.fontshare.com/v2/fonts/download/general-sans`, license bundled in the same zip |
| Geist | SIL Open Font License 1.1, full text at `geist/LICENSE.txt` | Yes — OFL explicitly permits bundling/embedding/redistributing with software, commercial or not. Cannot be sold as a standalone font. | `npm pack geist` (Vercel's official package), license bundled |
| JetBrains Mono | SIL Open Font License 1.1, full text at `jetbrains-mono/LICENSE.txt` | Yes — same OFL terms as Geist. | `github.com/JetBrains/JetBrainsMono` release v2.304, license bundled |

All three license texts are vendored alongside their font files (not just
linked) so the actual terms travel with the repo, not a URL that can
change or 404.

## Why this note exists

The previous session (`web-eng-plan-output.md`, decision 11) recorded that
real `.woff2` files for all three faces "were already sourced during
session 3's review-artifact build and are reusable." This session checked
before reusing them, per this repo's own convention of verifying prior
session claims rather than rubber-stamping them (see `docs/continuity/
NEXT.md`'s session 4/5 notes on outside-voice review). No `.woff2` files
for General Sans or JetBrains Mono exist anywhere in this repo, in any
local scratchpad this session could reach, or in git history — session 3's
review artifact was very likely published as a Claude Artifact (external,
not saved to the repo) with fonts embedded as base64 inside that HTML,
which this session has no way to retrieve. The claim wasn't malicious, just
unverifiable in practice — ephemeral session state doesn't durably persist
the way a committed file does. Re-sourced fresh this session instead;
no time lost (a few minutes), but flagging it so nobody goes looking for
files that were never actually reachable.
