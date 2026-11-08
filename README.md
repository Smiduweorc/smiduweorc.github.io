# smiduweorc.github.io

The Smiduweorc org site. A vivarium you can poke at, a cabinet of drawers, and
one worm in a can.

Live at <https://smiduweorc.github.io/>.

React, TypeScript, Vite and Tailwind v4. The deploy workflow builds with Node 24.

## How it is put together

| Path | What it is |
| --- | --- |
| `src/specimens.ts` | Every project on the site, one entry per org repo. |
| `src/vivarium/Vivarium.tsx` | The glass case. One rAF loop walks the critters and makes them dodge the pointer. |
| `src/vivarium/artwork.tsx` | Maps a specimen to its drawing. |
| `src/Cabinet.tsx` | The drawers. |
| `src/SpecimenCard.tsx` | The field-guide card that opens when you click a specimen. |
| `src/Magnifier.tsx` | The hand lens, which reveals `data-note` margin notes. |
| `src/bagworm/` | The mascot. Ported from grml's lab. |
| `src/theme.ts` | The palettes. Everything else is styled against eight CSS variables, so a theme is a list of colours. |

### Adding a project

Add an entry to `SPECIMENS` in `src/specimens.ts`. It shows up in the right
drawer automatically. Set `inTank: true` to also put it in the vivarium
(the case is full at the moment). Each one in the tank needs its own entry in
`TANK_DEPTH` in `Vivarium.tsx`, keyed by the specimen's `id`, or it falls back
to the middle of the case and shares a floor line with whatever is already
there.

If the repo has its own drawing at `assets/logo.png` or `assets/logo.jpeg`,
add it to `SOURCES` in `scripts/build-artwork.py`, run
`python3 scripts/build-artwork.py` (needs Pillow), and add an `ARTWORK` entry
with the ratio it prints. Otherwise point `art` at one of the drawn-here
fallbacks (`cocoon`, `grub`).

### Artwork

Most repos ship a hand-drawn side-on study at `assets/logo.png` (a couple at
`.jpeg`): white line art on near-black. `scripts/build-artwork.py` fetches
those and turns luminance into the alpha channel, so the site can paint them with
`background-color: currentColor` and have them sit at the right contrast on
every palette. One file per animal, not one per animal per theme.

The output in `public/collection/` is committed, so building the site never
needs Python or the network. Three are cropped, and `SOURCES` says why in each case: Bagworm's is
cut above the can, because the photographed can flattens into a grey slab when
it becomes a mask while the worm above it does not, and Repletes' is cut below
the rule the ant hangs from, because luminance cannot tell the scenery and the
starfield behind it from the animal. Argia's is cut above the lower of the two
lines it perches on, for the same reason.

## Deploying

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.
Set Settings > Pages > Source to GitHub Actions once and it takes over.

The build is plain static files with no runtime network calls, so Pages needs
nothing else from us. `public/.nojekyll` is there in case the Pages source is
ever switched back to branch deploys, which would otherwise run Jekyll over the
output.

The repo has to be named `smiduweorc.github.io`. Under any other name Pages
serves the site from `/<repo>/`, and since `base` is `"/"` the HTML still
loads while every script, stylesheet and image 404s: a blank page. If it ever
does move to a project repo, set `base` in `vite.config.ts` to `"/<repo>/"` to
match.

## Accessibility notes

Worth keeping true if you change things:

- Everything reachable by clicking a critter is also reachable by keyboard, and
  the whole collection is in the cabinet regardless.
- The vivarium's rAF loop does not start under `prefers-reduced-motion`. The
  critters get placed and left alone.
- The hand lens has no hover to work with on touch, so it pins every note open
  in place instead.
- Themes exist because grml has colour vision deficiency. If you add one, check
  it rather than eyeballing it.
