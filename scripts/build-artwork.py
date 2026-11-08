#!/usr/bin/env python3
"""Turn the org's repo logos into themeable alpha masks for the site.

Every repo that has its own drawing ships a hand-drawn side-on study at
assets/logo.png (or .jpeg): white line art on a near-black field. This script fetches each one and
converts luminance into the alpha channel, so the site can paint the drawing
with `background-color: currentColor` and have it sit at the right contrast
against all fifteen palettes. One file per animal instead of one per animal
per theme.

Re-run after changing a logo upstream:

    python3 scripts/build-artwork.py

Output lands in public/collection/ and is committed, so a plain `npm ci &&
npm run build` never needs network access or Python.
"""

from __future__ import annotations

import io
import os
import sys
import urllib.request

from PIL import Image

RAW = "https://raw.githubusercontent.com/Smiduweorc/{repo}/master/assets/{file}"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "collection")

# repo -> (output name, source filename, the band of the drawing to keep as
# fractions of its height)
#
# Most are the whole image. Two are not:
#
# Bagworm's logo is the worm-on-a-spring above a *photograph* of an aluminium
# can. The line art survives being turned into a mask. The photo does not: it
# flattens into a grey slab. So that one is cut just above the can's rim and
# only the worm rides along, which is also the half people recognise.
#
# Repletes is drawn as a scene rather than a specimen: the ant hangs upside
# down from a rule with a starfield above it. Luminance cannot tell scenery
# from animal, so the rule and every star would come through as linework. The
# cut is just below the rule, which loses the tips of the raised legs and
# keeps the head, thorax and the honeypot abdomen that is the whole point.
#
# Termite's logo is the odd one out twice over: orange fill on near-black
# rather than white line art, and drawn from above rather than side-on. It
# still masks cleanly, because luminance turns the body into a solid shape and
# the dark eyes into two holes in it. It reads as a filled silhouette next to
# the line drawings instead of matching them, which is the drawing's doing and
# not the script's. Firefly and Repletes have the same orange on them and land
# the same way: line art, with one part of the animal filled in.
#
# Argia is drawn perched on two long lines, and luminance would keep both. The
# cut is above the lower one, which leaves the twig it sits on and loses only
# scenery. Its two green eyes mask as dim spots.
#
# Mycocepurus has one green eye on it, dark enough that it masks as a dim spot
# rather than a hole. Phasmid is the plainest source in the set: one stroke
# weight, no fill, nothing to crop.
#
# Antlion is drawn from above with its wings spread, like Termite's pose but
# in white line art. The mesh inside each wing comes through as texture, which
# makes it the heaviest file here, and the two blue eyes mask as dim spots.
#
# RoveBeetle is Repletes' scene again, rule and starfield, but the stars sit
# all round the body, so no band can cut them out. The rule goes with the
# crop, and the stars go in despeckle(): the animal is one connected stroke
# and every star is a few pixels on its own.
SOURCES: dict[str, tuple[str, str, float, float]] = {
    "lacewing": ("lacewing", "logo.png", 0.0, 1.0),
    "Cephalote": ("cephalote", "logo.png", 0.0, 1.0),
    "Bagworm": ("bagworm", "logo.png", 0.0, 170 / 316),
    "termite": ("termite", "logo.png", 0.0, 1.0),
    "Aphid-template": ("aphid", "logo.jpeg", 0.0, 1.0),
    "dung-beetle-template": ("dung-beetle", "logo.jpeg", 0.0, 1.0),
    "firefly": ("firefly", "logo.png", 0.0, 1.0),
    "Repletes": ("repletes", "logo.png", 0.31, 1.0),
    "mycocepurus-smithii": ("mycocepurus", "logo.png", 0.0, 1.0),
    "phasmid": ("phasmid", "logo.png", 0.0, 1.0),
    "antlion": ("antlion", "logo.png", 0.0, 1.0),
    "leafcutter-ant": ("leafcutter-ant", "logo.png", 0.0, 1.0),
    "darter": ("darter", "logo.jpeg", 0.0, 1.0),
    "bollworm": ("bollworm", "logo.png", 0.0, 1.0),
    "Argia": ("argia", "logo.png", 0.0, 0.71),
    "RoveBeetle": ("rove-beetle", "logo.png", 0.18, 1.0),
}

# Bagworm is cut at the row just above the can's rim, which leaves the bottom
# of the lowest spring coil open where the rim used to close it. The last
# stretch of that curve is drawn back in, at the drawing's own stroke width,
# along the ellipse the rest of the coil follows.
#
# Argia perches on a twig that runs straight through its legs, so no crop can
# lose it. erase_line() rubs the twig out along its measured line, except in
# the columns where a leg meets it, so the legs and feet stay whole.
REPAIRS = {
    "Bagworm": lambda im: draw_arc(im, (100, 132, 204, 168), 20, 160, 3, 214),
    "Argia": lambda im: erase_line(im, (150, 298), (746, 276), 4),
}

# Sources whose scenery is scattered dots rather than a band. Any island of
# linework smaller than this many pixels is dropped before trimming. Argia is
# here for the crumbs of twig that erase_line() leaves between leg crossings.
DESPECKLE: dict[str, int] = {"RoveBeetle": 200, "Argia": 60}

# Pixels above this (post-normalisation) count as linework when finding the
# drawing's bounding box. Low enough to keep faint pencil, high enough to
# ignore JPEG-ish mush in the background.
INK_THRESHOLD = 24


def draw_arc(im: Image.Image, box: tuple[int, int, int, int], start: float,
             end: float, width: int, shade: int) -> None:
    """Draw part of an ellipse in source pixel coordinates, in the grey the
    surrounding linework is drawn in, so the repair does not stand out."""
    from PIL import ImageDraw
    ImageDraw.Draw(im).arc(box, start, end, fill=shade, width=width)


def erase_line(im: Image.Image, a: tuple[int, int], b: tuple[int, int],
               half: int) -> None:
    """Rub out a straight line from a to b, keeping the columns where
    something touches it from above or below: a leg crossing it, or a foot
    standing on it. Those keep a sliver of the line, which reads as the
    foot."""
    px = im.load()
    (x0, y0), (x1, y1) = a, b
    for x in range(max(0, x0), min(im.width, x1 + 1)):
        y = y0 + (y1 - y0) * (x - x0) / (x1 - x0)
        above = int(y) - half - 3
        below = int(y) + half + 3
        # Legs cross at a slant, so look a few columns either side too.
        near = range(max(0, x - 5), min(im.width, x + 6))
        if any(
            (0 <= above and px[n, above] > 120) or (below < im.height and px[n, below] > 120)
            for n in near
        ):
            continue
        for yy in range(int(y) - half, int(y) + half + 1):
            if 0 <= yy < im.height:
                px[x, yy] = 0


def despeckle(im: Image.Image, min_area: int) -> Image.Image:
    """Zero every 8-connected island of ink smaller than min_area pixels."""
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if seen[y * w + x] or px[x, y] <= INK_THRESHOLD:
                continue
            island, stack = [], [(x, y)]
            seen[y * w + x] = 1
            while stack:
                cx, cy = stack.pop()
                island.append((cx, cy))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] \
                                and px[nx, ny] > INK_THRESHOLD:
                            seen[ny * w + nx] = 1
                            stack.append((nx, ny))
            if len(island) < min_area:
                for ix, iy in island:
                    px[ix, iy] = 0
    return im


def build(repo: str, name: str, file: str, top: float, bottom: float) -> None:
    with urllib.request.urlopen(RAW.format(repo=repo, file=file), timeout=30) as resp:
        src = Image.open(io.BytesIO(resp.read()))

    im = src.convert("L")
    if repo in REPAIRS:
        REPAIRS[repo](im)

    if top > 0.0 or bottom < 1.0:
        im = im.crop((0, int(im.height * top), im.width, int(im.height * bottom)))

    # The source backgrounds are #111-ish rather than true black, so stretch
    # the range: background becomes fully transparent, linework fully opaque.
    #
    # The black point is the *most common* value rather than the darkest one.
    # On the lossless sources the two are the same, because the background is
    # a single flat value covering three quarters of the frame. On the JPEGs
    # they are not: ringing scatters a few pixels below the background, the
    # stretch then starts from those instead, and the background itself lands
    # a little above zero. That reads as a faint filled rectangle the size of
    # the whole image once the mask is painted in currentColor.
    hist = im.histogram()
    black = max(range(256), key=lambda v: hist[v])
    hi = im.getextrema()[1]
    if hi > black:
        im = im.point(
            lambda p, b=black, hi=hi: 0 if p <= b else int(255 * (p - b) / (hi - b))
        )

    if repo in DESPECKLE:
        im = despeckle(im, DESPECKLE[repo])

    # Trim to the drawing so it fills whatever box the layout gives it.
    bbox = im.point(lambda p: 255 if p > INK_THRESHOLD else 0).getbbox()
    if bbox:
        im = im.crop(bbox)

    mask = Image.new("RGBA", im.size, (255, 255, 255, 0))
    mask.putalpha(im)

    path = os.path.normpath(os.path.join(OUT_DIR, f"{name}.png"))
    mask.save(path, optimize=True)
    print(f"{name}: {im.width}x{im.height}  ratio {im.width / im.height:.4f}  "
          f"{os.path.getsize(path)} bytes")


def main() -> int:
    os.makedirs(os.path.normpath(OUT_DIR), exist_ok=True)
    for repo, (name, file, top, bottom) in SOURCES.items():
        build(repo, name, file, top, bottom)
    print("\nUpdate the `ratio` values in src/vivarium/artwork.tsx if they moved.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
