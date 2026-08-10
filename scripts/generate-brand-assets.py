#!/usr/bin/env python3
"""
Generate Loop Governance web brand assets (session web-06-brand, 2026-08-10).

Produces:
- packages/ui/assets/brand/icon-mark-{512,256}.png, favicon-{16x16,32x32}.png,
  apple-touch-icon.png — cropped from the existing Loop Cmbntr infinity glyph
  (apps/portal/public/logo-full.png), which is already blue-violet and needs
  no recolouring to fit Signal Pulse's accent gradient (#4f6bff -> #8b5cf6).
- packages/ui/assets/brand/wordmark-{console,portal,admin}.svg — vector
  "Loop_" + app-name lockups for sidebar/header chrome.
- packages/ui/assets/brand/og-{console,portal,admin}.png — static 1200x630
  social preview images for each app's root/marketing pages (NOT the badge
  pages, which already have real per-badge dynamic OG images via
  apps/portal/src/app/badge/[userId]/[subject]/og/route.tsx — verified
  working, out of scope here).

Re-run this script any time the source glyph or copy changes; it is the
source of truth for the generated PNGs, per project convention (see
memory: persist generation scripts to scripts/, not scratchpad).

Requires: Pillow (PIL). Font files read from packages/ui/fonts/ (same set
this session sourced and licensed for self-hosting — see
packages/ui/fonts/README.md).
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND_DIR = os.path.join(ROOT, "packages/ui/assets/brand")
FONTS_DIR = os.path.join(ROOT, "packages/ui/fonts")
SOURCE_LOGO = os.path.join(ROOT, "apps/portal/public/logo-full.png")

os.makedirs(BRAND_DIR, exist_ok=True)

# Signal Pulse tokens (DESIGN.web.md) — kept in sync by hand with tokens.css
BG = (10, 10, 10)  # #0a0a0a
TEXT_PRIMARY = (245, 245, 244)  # #f5f5f4
TEXT_SECONDARY = (146, 151, 173)  # #9297ad
ACCENT_START = (79, 107, 255)  # #4f6bff
ACCENT_END = (139, 92, 246)  # #8b5cf6

GENERAL_SANS_BOLD = os.path.join(FONTS_DIR, "general-sans", "GeneralSans-Bold.woff2")
GEIST_REGULAR = os.path.join(FONTS_DIR, "geist", "Geist-Regular.woff2")

# PIL's ImageFont can't read woff2 directly (needs raw TTF/OTF). We keep a
# tiny converted-on-the-fly TTF cache using fontTools, since the only files
# on disk are woff2 (the format apps self-host). This keeps a single source
# of font truth instead of vendoring a second copy of each face.


def _woff2_to_ttf_bytes(woff2_path: str) -> bytes:
    from fontTools.ttLib import TTFont
    import io

    f = TTFont(woff2_path)
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue()


def load_font(woff2_path: str, size: int) -> ImageFont.FreeTypeFont:
    import io

    ttf_bytes = _woff2_to_ttf_bytes(woff2_path)
    return ImageFont.truetype(io.BytesIO(ttf_bytes), size)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_text(draw_target_size, text, font, direction="h"):
    """Render text with a horizontal accent-gradient fill, returned as an
    RGBA image sized to the text bbox (transparent elsewhere)."""
    tmp = Image.new("RGBA", draw_target_size, (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    d.text((0, 0), text, font=font, fill=(255, 255, 255, 255))
    bbox = tmp.getbbox()
    if not bbox:
        return tmp
    w = draw_target_size[0]
    grad = Image.new("RGBA", draw_target_size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for x in range(w):
        t = x / max(w - 1, 1)
        gd.line([(x, 0), (x, draw_target_size[1])], fill=lerp(ACCENT_START, ACCENT_END, t) + (255,))
    grad.putalpha(tmp.split()[3])
    return grad


def make_icon_mark():
    src = Image.open(SOURCE_LOGO).convert("RGB")
    pad = 30
    box = (88 - pad, 128 - pad, 372 + pad, 270 + pad)
    glyph = src.crop(box)
    gw, gh = glyph.size

    canvas_size = 512
    canvas = Image.new("RGB", (canvas_size, canvas_size), BG)
    target_w = int(canvas_size * 0.78)
    scale = target_w / gw
    target_h = int(gh * scale)
    glyph_resized = glyph.resize((target_w, target_h), Image.LANCZOS)
    x = (canvas_size - target_w) // 2
    y = (canvas_size - target_h) // 2
    canvas.paste(glyph_resized, (x, y))

    mask = Image.new("L", (canvas_size, canvas_size), 0)
    d = ImageDraw.Draw(mask)
    rx = int(canvas_size * 0.22)
    d.rounded_rectangle([0, 0, canvas_size - 1, canvas_size - 1], radius=rx, fill=255)

    out = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask)
    out.save(os.path.join(BRAND_DIR, "icon-mark-512.png"))

    for size, name in [
        (16, "favicon-16x16.png"),
        (32, "favicon-32x32.png"),
        (180, "apple-touch-icon.png"),
        (256, "icon-mark-256.png"),
    ]:
        out.resize((size, size), Image.LANCZOS).save(os.path.join(BRAND_DIR, name))

    return out


def make_og_image(app_key: str, title: str, subtitle: str, tagline: str):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # soft radial-ish accent glow in the corner (approximated with layered
    # translucent ellipses, since PIL has no native radial gradient fill)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = W - 180, 120
    for r, alpha in [(520, 10), (400, 14), (280, 18), (160, 22)]:
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ACCENT_END + (alpha,))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(img)

    # icon mark, top-left
    icon = Image.open(os.path.join(BRAND_DIR, "icon-mark-256.png")).convert("RGBA")
    icon_size = 96
    icon_small = icon.resize((icon_size, icon_size), Image.LANCZOS)
    icon_x, icon_y = 80, 72
    img.paste(icon_small, (icon_x, icon_y), icon_small)

    # wordmark "Loop_" next to icon — "Loop" primary, "_" gradient
    word_font = load_font(GENERAL_SANS_BOLD, 40)
    wx = icon_x + icon_size + 24
    wy = icon_y + 20
    draw.text((wx, wy), "Loop", font=word_font, fill=TEXT_PRIMARY)
    loop_w = draw.textlength("Loop", font=word_font)
    underscore_img = gradient_text((80, 60), "_", word_font)
    img.paste(underscore_img, (int(wx + loop_w) - 6, wy - 6), underscore_img)

    # app label pill
    label_font = load_font(GEIST_REGULAR, 22)
    label_x = wx + int(loop_w) + 30
    draw.text((label_x, wy + 6), subtitle, font=label_font, fill=TEXT_SECONDARY)

    # headline
    title_font = load_font(GENERAL_SANS_BOLD, 64)
    ty = 300
    # simple manual wrap at ~24 chars/line for this font size at 1200 width
    words = title.split(" ")
    lines, cur = [], ""
    for w_ in words:
        trial = (cur + " " + w_).strip()
        if draw.textlength(trial, font=title_font) > 1000:
            lines.append(cur)
            cur = w_
        else:
            cur = trial
    if cur:
        lines.append(cur)
    for i, line in enumerate(lines):
        draw.text((80, ty + i * 76), line, font=title_font, fill=TEXT_PRIMARY)

    # tagline
    tag_font = load_font(GEIST_REGULAR, 28)
    tag_y = ty + len(lines) * 76 + 24
    draw.text((80, tag_y), tagline, font=tag_font, fill=TEXT_SECONDARY)

    # bottom accent gradient bar
    bar_h = 6
    bar_img = Image.new("RGBA", (W, bar_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar_img)
    for x in range(W):
        t = x / (W - 1)
        bd.line([(x, 0), (x, bar_h)], fill=lerp(ACCENT_START, ACCENT_END, t) + (255,))
    img.paste(bar_img, (0, H - bar_h), bar_img)

    img.save(os.path.join(BRAND_DIR, f"og-{app_key}.png"))


def main():
    make_icon_mark()
    make_og_image(
        "portal",
        "Rule the world. And get paid for it.",
        "Governance",
        "gov.loopcmbntr.live: delegation, accreditation, and treasury for real communities.",
    )
    make_og_image(
        "console",
        "Your voice has real weight here.",
        "Console",
        "console.loopcmbntr.live: the member dashboard for Loop governance.",
    )
    make_og_image(
        "admin",
        "Platform administration.",
        "Admin",
        "Internal ops: moderation, governance config, audit log.",
    )
    print("Brand assets written to", BRAND_DIR)


if __name__ == "__main__":
    main()
