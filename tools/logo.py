"""Draws the NepDate mark and its per-port variants.

The mark is the outline of Nepal's flag inside a ring, redrawn from the C# NepDate logo. Each port
adds a badge with its language in that language's usual colour. Output, per name in LANGS:
`<name>.svg` (vector), `<name>.png` (512 px) and `<name>-128.png`, all with a transparent outside.
Geometry is on a 936 x 936 canvas, the size of the original raster.

    python tools/logo.py assets/logo path/to/NotoSans-Variable.ttf

The font only draws the badge text in the PNGs; the SVGs name Noto Sans with system fallbacks.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

RED = "#D8143A"
S = 936
C = S / 2

# Ring
RING_R = 447  # centre line radius
RING_W = 30

# Flag outline: top edge, upper tip, back along the middle, down to the lower tip.
FLAG = [(220, 100), (830, 458), (296, 447), (712, 850)]
FLAG_W = 30

# Moon: the lower part of a disc minus an offset disc, plus a half sun of rays.
MOON_C = (285, 285)
MOON_R = 120
MOON_CUT_C = (285, 235)
MOON_CUT_R = 130
HALF_SUN_C = (285, 330)
HALF_SUN_RO, HALF_SUN_RI, HALF_SUN_N = 68, 48, 16

# Sun: 12-point star.
SUN_C = (285, 662)
SUN_RO, SUN_RI, SUN_N = 124, 82, 12


def star(cx, cy, ro, ri, n, rot=-90.0):
    pts = []
    for k in range(2 * n):
        r = ro if k % 2 == 0 else ri
        a = math.radians(rot + k * 180.0 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def svg(badge=None):
    def pts(p):
        return " ".join(f"{x:.1f},{y:.1f}" for x, y in p)

    mx, my = MOON_C
    cx, cy = MOON_CUT_C
    hx, hy = HALF_SUN_C
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">',
        "<defs>",
        f'<mask id="moon"><rect width="{S}" height="{S}" fill="#fff"/>'
        f'<circle cx="{cx}" cy="{cy}" r="{MOON_CUT_R}" fill="#000"/></mask>',
        f'<clipPath id="inside"><circle cx="{C}" cy="{C}" r="{RING_R}"/></clipPath>',
        f'<clipPath id="halfsun"><rect x="0" y="0" width="{S}" height="{hy}"/></clipPath>',
        "</defs>",
        f'<circle cx="{C}" cy="{C}" r="{RING_R}" fill="#fff"/>',
        f'<polyline points="{pts(FLAG)}" fill="none" stroke="{RED}" stroke-width="{FLAG_W}" '
        f'stroke-linejoin="miter" stroke-miterlimit="10" clip-path="url(#inside)"/>',
        f'<circle cx="{mx}" cy="{my}" r="{MOON_R}" fill="{RED}" mask="url(#moon)"/>',
        f'<polygon points="{pts(star(hx, hy, HALF_SUN_RO, HALF_SUN_RI, HALF_SUN_N))}" fill="{RED}" '
        f'clip-path="url(#halfsun)"/>',
        f'<circle cx="{hx}" cy="{hy}" r="{HALF_SUN_RI + 2}" fill="{RED}"/>',
        f'<polygon points="{pts(star(*SUN_C, SUN_RO, SUN_RI, SUN_N))}" fill="{RED}"/>',
        # The ring last, so it covers the flag line ends; outside it is transparent.
        f'<circle cx="{C}" cy="{C}" r="{RING_R}" fill="none" stroke="{RED}" stroke-width="{RING_W}"/>',
    ]
    if badge:
        label, colour, text_colour = badge
        bx, by, bw, bh = badge_box(label)
        parts.append(
            f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="{bh / 2}" fill="{colour}" '
            f'stroke="#fff" stroke-width="14"/>'
        )
        parts.append(
            f'<text x="{bx + bw / 2}" y="{by + bh / 2}" fill="{text_colour}" font-family="Noto Sans, '
            f'Segoe UI, Helvetica, Arial, sans-serif" font-weight="700" font-size="{BADGE_FONT}" '
            f'text-anchor="middle" dominant-baseline="central">{label}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n"


BADGE_FONT = 128
BADGE_H = 190


def badge_box(label):
    w = max(BADGE_H, 70 + 78 * len(label))
    right, bottom = S - 8, S - 8
    return right - w, bottom - BADGE_H, w, BADGE_H


def render(badge, size, font_path):
    k = 4  # supersample
    W = S * k
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def sc(p):
        return [(x * k, y * k) for x, y in p]

    # ring
    r_out = (RING_R + RING_W / 2) * k
    r_in = (RING_R - RING_W / 2) * k
    d.ellipse([C * k - r_in, C * k - r_in, C * k + r_in, C * k + r_in], fill="#fff")
    # flag: one polygon, the polyline offset to both sides with mitred joints
    d.polygon(sc(stroke_outline(FLAG, FLAG_W / 2)), fill=RED)
    # moon
    moon = Image.new("L", (W, W), 0)
    md = ImageDraw.Draw(moon)
    mx, my = MOON_C
    md.ellipse([(mx - MOON_R) * k, (my - MOON_R) * k, (mx + MOON_R) * k, (my + MOON_R) * k], fill=255)
    cut = Image.new("L", (W, W), 0)
    cd = ImageDraw.Draw(cut)
    cx, cy = MOON_CUT_C
    cd.ellipse([(cx - MOON_CUT_R) * k, (cy - MOON_CUT_R) * k, (cx + MOON_CUT_R) * k, (cy + MOON_CUT_R) * k], fill=255)
    hx, hy = HALF_SUN_C
    half = Image.new("L", (W, W), 0)
    hd = ImageDraw.Draw(half)
    hd.polygon(sc(star(hx, hy, HALF_SUN_RO, HALF_SUN_RI, HALF_SUN_N)), fill=255)
    hd.rectangle([0, hy * k, W, W], fill=0)
    disc = Image.new("L", (W, W), 0)
    ImageDraw.Draw(disc).ellipse(
        [(hx - HALF_SUN_RI - 2) * k, (hy - HALF_SUN_RI - 2) * k, (hx + HALF_SUN_RI + 2) * k, (hy + HALF_SUN_RI + 2) * k], fill=255
    )
    moon_mask = ImageChops.lighter(ImageChops.subtract(moon, cut), half)
    moon_mask = ImageChops.lighter(moon_mask, disc)
    img.paste(Image.new("RGBA", (W, W), RED), (0, 0), moon_mask)
    # sun
    d.polygon(sc(star(*SUN_C, SUN_RO, SUN_RI, SUN_N)), fill=RED)
    # everything outside the ring's inner edge goes transparent, then the ring itself
    inside = Image.new("L", (W, W), 0)
    ImageDraw.Draw(inside).ellipse([C * k - r_in, C * k - r_in, C * k + r_in, C * k + r_in], fill=255)
    img.putalpha(ImageChops.multiply(img.getchannel("A"), inside))
    ring = Image.new("L", (W, W), 0)
    rd = ImageDraw.Draw(ring)
    rd.ellipse([C * k - r_out, C * k - r_out, C * k + r_out, C * k + r_out], fill=255)
    rd.ellipse([C * k - r_in, C * k - r_in, C * k + r_in, C * k + r_in], fill=0)
    img.paste(Image.new("RGBA", (W, W), RED), (0, 0), ring)
    d = ImageDraw.Draw(img)
    # white disc fill under everything: the ring interior is white already
    if badge:
        label, colour, text_colour = badge
        bx, by, bw, bh = badge_box(label)
        pad = 7 * k
        d.rounded_rectangle([bx * k - pad, by * k - pad, (bx + bw) * k + pad, (by + bh) * k + pad], radius=bh / 2 * k + pad, fill="#fff")
        d.rounded_rectangle([bx * k, by * k, (bx + bw) * k, (by + bh) * k], radius=bh / 2 * k, fill=colour)
        font = ImageFont.truetype(font_path, BADGE_FONT * k)
        try:
            font.set_variation_by_name("Bold")
        except Exception:
            pass
        d.text(((bx + bw / 2) * k, (by + bh / 2) * k), label, fill=text_colour, font=font, anchor="mm")
    return img.resize((size, size), Image.LANCZOS)


def stroke_outline(points, h):
    """Polygon of a polyline stroked with half width h, square ends and mitred joints."""
    def offset_line(p, q, side):
        dx, dy = q[0] - p[0], q[1] - p[1]
        L = math.hypot(dx, dy)
        nx, ny = -dy / L * h * side, dx / L * h * side
        return (p[0] + nx, p[1] + ny), (q[0] + nx, q[1] + ny)

    def intersect(l1, l2):
        (x1, y1), (x2, y2) = l1
        (x3, y3), (x4, y4) = l2
        den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
        t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
        return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))

    sides = []
    for side in (1, -1):
        lines = [offset_line(p, q, side) for p, q in zip(points, points[1:])]
        pts = [lines[0][0]]
        for l1, l2 in zip(lines, lines[1:]):
            pts.append(intersect(l1, l2))
        pts.append(lines[-1][1])
        sides.append(pts)
    return sides[0] + sides[1][::-1]


LANGS = {
    "nepdate": None,
    "nepdate-cpp": ("C++", "#00599C", "#FFFFFF"),
    "nepdate-rust": ("Rust", "#B7410E", "#FFFFFF"),
    "nepdate-go": ("Go", "#00ADD8", "#FFFFFF"),
    "nepdate-typescript": ("TS", "#3178C6", "#FFFFFF"),
    "nepdate-python": ("Py", "#3776AB", "#FFD43B"),
    "nepdate-swift": ("Swift", "#F05138", "#FFFFFF"),
    "nepdate-kotlin": ("Kt", "#7F52FF", "#FFFFFF"),
    "nepdate-mobile": ("App", "#1F2937", "#FFFFFF"),
}

if __name__ == "__main__":
    out = Path(sys.argv[1])
    font = sys.argv[2]
    out.mkdir(parents=True, exist_ok=True)
    for name, badge in LANGS.items():
        (out / f"{name}.svg").write_text(svg(badge), encoding="utf-8", newline="\n")
        render(badge, 512, font).save(out / f"{name}.png")
        render(badge, 128, font).save(out / f"{name}-128.png")
    print("ok")
