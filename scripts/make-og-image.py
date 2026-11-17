"""Builds web/og-image.png — the picture shown when an ARK link is shared (1200 x 630).

Run from the repository root:   python scripts/make-og-image.py
Needs Pillow (pip install pillow). Uses Georgia and Segoe UI on Windows and falls back to
DejaVu elsewhere, so the image stays in ARK's warm-cream style.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

S = 2                                   # draw at 2x, then shrink for smooth edges
W, H = 1200 * S, 630 * S
CREAM, CARD, LINE = "#f0ebe0", "#faf7f0", "#d9cfba"
INK, SOFT, ACCENT, ACCENT_DARK = "#1a1612", "#5a5248", "#8b6f3e", "#7a5f30"

HEADLINE = ["Backup internet, AI", "& more — for when", "crisis hits."]
SUBLINE = ["A free emergency app that keeps working", "when the internet is down."]
CHIPS = ["Messaging", "Offline AI", "Maps", "First aid", "Family plan"]
FOOTER_LEFT = "arks.solutions"
FOOTER_RIGHT = "Free  ·  No account  ·  Works offline"


def font(names, size):
    for name in names:
        for folder in ("C:/Windows/Fonts", "/usr/share/fonts/truetype/dejavu", "/Library/Fonts", ""):
            try:
                return ImageFont.truetype(str(Path(folder) / name), size * S)
            except OSError:
                continue
    return ImageFont.load_default()


serif_bold = lambda size: font(["georgiab.ttf", "DejaVuSerif-Bold.ttf"], size)
sans = lambda size: font(["segoeui.ttf", "DejaVuSans.ttf"], size)
sans_semibold = lambda size: font(["seguisb.ttf", "segoeuib.ttf", "DejaVuSans-Bold.ttf"], size)
sans_black = lambda size: font(["seguibl.ttf", "segoeuib.ttf", "DejaVuSans-Bold.ttf"], size)

img = Image.new("RGB", (W, H), CREAM)
d = ImageDraw.Draw(img)

# Soft card that holds everything, like the cards inside the app
PAD = 44 * S
d.rounded_rectangle([PAD, PAD, W - PAD, H - PAD], radius=36 * S, fill=CARD, outline=LINE, width=2 * S)

# Shield mark (same shape as the app icon) on the right
cx, top, sw, sh = W - 250 * S, 150 * S, 250 * S, 300 * S
shield = [
    (cx, top),
    (cx + sw // 2, top + int(sh * 0.16)),
    (cx + sw // 2, top + int(sh * 0.52)),
    (cx + int(sw * 0.30), top + int(sh * 0.82)),
    (cx, top + sh),
    (cx - int(sw * 0.30), top + int(sh * 0.82)),
    (cx - sw // 2, top + int(sh * 0.52)),
    (cx - sw // 2, top + int(sh * 0.16)),
]
d.polygon(shield, fill=ACCENT)
mark = sans_black(74)
box = d.textbbox((0, 0), "ARK", font=mark)
d.text((cx - (box[2] - box[0]) // 2 - box[0], top + int(sh * 0.40) - (box[3] - box[1]) // 2 - box[1]), "ARK", font=mark, fill=CARD)

# Eyebrow
x = PAD + 56 * S
y = PAD + 44 * S
d.text((x, y), "ARK CRISIS SUITE", font=sans_semibold(22), fill=ACCENT)
y += 48 * S

# Headline
head = serif_bold(62)
for line in HEADLINE:
    d.text((x, y), line, font=head, fill=INK)
    y += 72 * S
y += 10 * S

# Subline
sub = sans(29)
for line in SUBLINE:
    d.text((x, y), line, font=sub, fill=SOFT)
    y += 38 * S
y += 12 * S

# Feature chips
chip_font = sans_semibold(21)
cx2 = x
for chip in CHIPS:
    tw = d.textlength(chip, font=chip_font)
    cw = int(tw + 36 * S)
    d.rounded_rectangle([cx2, y, cx2 + cw, y + 44 * S], radius=22 * S, fill=CREAM, outline=LINE, width=2 * S)
    d.text((cx2 + 18 * S, y + 8 * S), chip, font=chip_font, fill=ACCENT_DARK)
    cx2 += cw + 12 * S

# Footer
foot_y = H - PAD - 62 * S
d.text((x, foot_y), FOOTER_LEFT, font=sans_semibold(26), fill=INK)
right = sans(22)
rw = d.textlength(FOOTER_RIGHT, font=right)
d.text((W - PAD - 56 * S - rw, foot_y + 4 * S), FOOTER_RIGHT, font=right, fill=SOFT)

out = Path(__file__).resolve().parent.parent / "web" / "og-image.png"
img.resize((1200, 630), Image.LANCZOS).save(out, optimize=True)
print("wrote", out, out.stat().st_size, "bytes")
