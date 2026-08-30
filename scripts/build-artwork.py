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
SOURCES: dict[str, tuple[str, str, float, float]] = {
    "lacewing": ("lacewing", "logo.png", 0.0, 1.0),
    "Cephalote": ("cephalote", "logo.png", 0.0, 1.0),
    "Bagworm": ("bagworm", "logo.png", 0.0, 0.52),
    "termite": ("termite", "logo.png", 0.0, 1.0),
    "Aphid-template": ("aphid", "logo.jpeg", 0.0, 1.0),
    "dung-beetle-template": ("dung-beetle", "logo.jpeg", 0.0, 1.0),
    "firefly": ("firefly", "logo.png", 0.0, 1.0),
    "Repletes": ("repletes", "logo.png", 0.31, 1.0),
}

# Pixels above this (post-normalisation) count as linework when finding the
# drawing's bounding box. Low enough to keep faint pencil, high enough to
# ignore JPEG-ish mush in the background.
INK_THRESHOLD = 24


def build(repo: str, name: str, file: str, top: float, bottom: float) -> None:
    with urllib.request.urlopen(RAW.format(repo=repo, file=file), timeout=30) as resp:
        src = Image.open(io.BytesIO(resp.read()))

    im = src.convert("L")

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
