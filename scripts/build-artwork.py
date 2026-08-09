#!/usr/bin/env python3
"""Turn the org's repo logos into themeable alpha masks for the site.

Every flagship repo ships a hand-drawn side-on study at assets/logo.png:
white line art on a near-black field. This script fetches each one and
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

RAW = "https://raw.githubusercontent.com/Smiduweorc/{repo}/master/assets/logo.png"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "collection")

# repo -> (output name, bottom crop fraction)
#
# Bagworm's logo is the worm-on-a-spring above a *photograph* of an aluminium
# can. The line art survives being turned into a mask. The photo does not: it
# flattens into a grey slab. So that one is cut just above the can's rim and
# only the worm rides along, which is also the half people recognise.
#
# Termite's logo is the odd one out twice over: orange fill on near-black
# rather than white line art, and drawn from above rather than side-on. It
# still masks cleanly, because luminance turns the body into a solid shape and
# the dark eyes into two holes in it. It reads as a filled silhouette next to
# the line drawings instead of matching them, which is the drawing's doing and
# not the script's.
SOURCES: dict[str, tuple[str, float]] = {
    "lacewing": ("lacewing", 1.0),
    "Cephalote": ("cephalote", 1.0),
    "Bagworm": ("bagworm", 0.52),
    "termite": ("termite", 1.0),
}

# Pixels above this (post-normalisation) count as linework when finding the
# drawing's bounding box. Low enough to keep faint pencil, high enough to
# ignore JPEG-ish mush in the background.
INK_THRESHOLD = 24


def build(repo: str, name: str, keep_top: float) -> None:
    with urllib.request.urlopen(RAW.format(repo=repo), timeout=30) as resp:
        src = Image.open(io.BytesIO(resp.read()))

    im = src.convert("L")

    if keep_top < 1.0:
        im = im.crop((0, 0, im.width, int(im.height * keep_top)))

    # The source backgrounds are #111-ish rather than true black, so stretch
    # the range: darkest pixel becomes fully transparent, linework fully opaque.
    lo, hi = im.getextrema()
    if hi > lo:
        im = im.point(lambda p, lo=lo, hi=hi: int(255 * (p - lo) / (hi - lo)))

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
    for repo, (name, keep_top) in SOURCES.items():
        build(repo, name, keep_top)
    print("\nUpdate the `ratio` values in src/vivarium/artwork.tsx if they moved.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
