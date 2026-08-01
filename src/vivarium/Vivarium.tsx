// The vivarium: a glass tank with the flagship projects living in it.
//
// The org's own artwork is drawn side-on, so the tank is a side-on view too:
// the animals walk the floor rather than crawling around a top-down plan.
// Walking left flips the drawing instead of rotating it, which is the only
// honest thing to do with a side view: a rotated side view reads as a dead
// insect on its back.
//
// One requestAnimationFrame loop writes transforms straight onto the DOM
// nodes. Per-frame React state for a handful of critters would re-render the
// section sixty times a second to move some pixels the browser can move on
// its own.

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Plate, artworkRatio, artworkScale, type ArtworkKey } from "./artwork";
import { tankSpecimens, type Specimen } from "../specimens";

// ── Tuning ──────────────────────────────────────────────────────────
const CRUISE_SPEED = 17; // px/s of ambling
const FLEE_SPEED = 150; // px/s at full panic
const FLEE_RADIUS = 115; // px: pointer closer than this and it bolts
const FLEE_DECAY = 1.6; // panic shed per second once out of range
const PAUSE_CHANCE = 0.22; // odds of stopping to think at each turn
const PAUSE_MIN = 700;
const PAUSE_MAX = 3200;
const WALL_PAD = 8;
const SCATTER_MS = 1500; // how long a tap on the glass keeps everyone running
const FLOOR_BAND = 0.34; // fraction of tank height the floor occupies
// Two critters closer than this (as a fraction of their combined width) are
// treated as bumping into each other. Without it they eventually converge on
// the same patch of floor and sit on top of one another, which reads as a
// rendering bug rather than as animals.
const PERSONAL_SPACE = 0.55;

type Critter = {
	key: string;
	specimen: Specimen | null; // null = ambient background critter
	art: ArtworkKey;
	width: number; // rendered width in px
	depth: number; // 0 = at the glass, 1 = at the back wall
	x: number; // px, centre
	y: number; // px, feet
	dir: 1 | -1;
	pauseUntil: number;
	flee: number; // 0..1
	gait: number; // radians, advances with distance walked
	el: HTMLElement | null;
};

// The art is a fixed drawing, so the walk has to come from how the whole
// thing is moved: a small bounce and a rock, both driven by distance covered
// rather than by time. Tie a gait to the clock and a critter that has stopped
// keeps jogging on the spot.
const GAIT_PER_PX = 0.42; // radians of cycle per pixel travelled
const BOUNCE_PX = 1.6;
const ROCK_DEG = 2.4;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const onChange = () => setReduced(mq.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);
	return reduced;
}

/** Extras that fill the tank out. Too small to click, and unlabelled. */
const AMBIENT: { art: ArtworkKey; depth: number }[] = [
	{ art: "grub", depth: 0.85 },
	{ art: "cocoon", depth: 0.7 },
	{ art: "grub", depth: 0.95 },
];

export function Vivarium({ onOpen }: { onOpen: (s: Specimen) => void }) {
	const reduced = usePrefersReducedMotion();
	const tankRef = useRef<HTMLDivElement>(null);
	const crittersRef = useRef<Critter[]>([]);
	const boundsRef = useRef({ w: 0, h: 0 });
	const pointerRef = useRef<number | null>(null); // tank-local x only
	const scatterUntilRef = useRef(0);

	const [hovered, setHovered] = useState<string | null>(null);
	const [shaking, setShaking] = useState(false);

	if (crittersRef.current.length === 0) {
		const flagships = tankSpecimens();
		crittersRef.current = [
			...flagships.map<Critter>((s, i) => ({
				key: s.id,
				specimen: s,
				art: s.art,
				// Insect-sized against the case rather than poster-sized: a
				// lacewing you could hold in your hand, not one filling a
				// vivarium.
				width: Math.round(58 * artworkScale(s.art)),
				depth: [0.15, 0.55, 0.35][i % 3],
				x: 0,
				y: 0,
				dir: i % 2 === 0 ? 1 : -1,
				pauseUntil: 0,
				flee: 0,
				gait: Math.random() * Math.PI * 2,
				el: null,
			})),
			...AMBIENT.map<Critter>((a, i) => ({
				key: `ambient-${i}`,
				specimen: null,
				art: a.art,
				width: Math.round(58 * artworkScale(a.art)),
				depth: a.depth,
				x: 0,
				y: 0,
				dir: i % 2 === 0 ? -1 : 1,
				pauseUntil: 0,
				flee: 0,
				gait: Math.random() * Math.PI * 2,
				el: null,
			})),
		];
	}

	/** Feet line for a given depth: further back sits higher up the glass. */
	const floorY = useCallback((depth: number) => {
		const { h } = boundsRef.current;
		return h - WALL_PAD - depth * (h * FLOOR_BAND);
	}, []);

	const draw = useCallback((c: Critter) => {
		if (!c.el) return;
		// Things further away are drawn smaller. Scale, flip, bounce and rock
		// all ride on the one transform so the browser composites once.
		const scale = 1 - c.depth * 0.32;
		const bounce = Math.abs(Math.sin(c.gait)) * BOUNCE_PX;
		const rock = Math.sin(c.gait * 0.5) * ROCK_DEG;
		c.el.style.transform =
			`translate3d(${c.x - c.width / 2}px, ${c.y - bounce}px, 0) ` +
			`rotate(${rock * c.dir}deg) ` +
			`scale(${scale * c.dir}, ${scale})`;
	}, []);

	const layout = useCallback(
		(reseed: boolean) => {
			const el = tankRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			boundsRef.current = { w: r.width, h: r.height };
			const list = crittersRef.current;
			list.forEach((c, i) => {
				const pad = WALL_PAD + c.width / 2;
				const span = Math.max(0, r.width - pad * 2);
				if (reseed) {
					// Spaced across the width so nobody spawns on top of anyone.
					c.x = pad + ((i + 0.5) / list.length) * span;
				} else {
					c.x = Math.min(Math.max(c.x, pad), pad + span);
				}
				c.y = floorY(c.depth);
				draw(c);
			});
		},
		[draw, floorY],
	);

	useLayoutEffect(() => {
		layout(true);
	}, [layout]);

	useEffect(() => {
		const onResize = () => layout(false);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [layout]);

	useEffect(() => {
		if (reduced) return; // everyone stays where layout() put them
		let raf = 0;
		let last = performance.now();

		const step = (now: number) => {
			const dt = Math.min((now - last) / 1000, 0.05); // cap after a tab switch
			last = now;
			const { w } = boundsRef.current;
			const scattering = now < scatterUntilRef.current;
			const pointerX = pointerRef.current;

			for (const c of crittersRef.current) {
				const pad = WALL_PAD + c.width / 2;

				if (scattering) {
					c.flee = 1;
					c.pauseUntil = 0;
				} else {
					if (pointerX !== null) {
						const d = Math.abs(pointerX - c.x);
						if (d < FLEE_RADIUS) {
							c.flee = Math.max(c.flee, 1 - d / FLEE_RADIUS);
							c.pauseUntil = 0;
							// Run the other way, unless that means running into
							// the glass. Cornered, it squeezes past instead.
							const away: 1 | -1 = pointerX > c.x ? -1 : 1;
							if (away === 1 ? c.x < w - pad : c.x > pad) c.dir = away;
						}
					}
					c.flee = Math.max(0, c.flee - FLEE_DECAY * dt);
				}

				if (now < c.pauseUntil) {
					draw(c);
					continue;
				}

				const speed = CRUISE_SPEED + (FLEE_SPEED - CRUISE_SPEED) * c.flee;
				const travelled = speed * dt;
				c.x += c.dir * travelled;
				// Smaller animals take quicker steps, so the cycle scales with
				// how big the drawing is rather than being the same for all.
				c.gait += (travelled * GAIT_PER_PX * 40) / c.width;

				// Turn at the glass, and sometimes have a think about it first.
				if (c.x <= pad || c.x >= w - pad) {
					c.x = Math.min(Math.max(c.x, pad), w - pad);
					c.dir = c.dir === 1 ? -1 : 1;
					if (c.flee < 0.05 && Math.random() < PAUSE_CHANCE) {
						c.pauseUntil = now + rand(PAUSE_MIN, PAUSE_MAX);
					}
				}

				draw(c);
			}

			// Second pass: anyone who has walked into someone turns round. Done
			// after everything has moved so the pair see the same gap and both
			// react to it.
			//
			// This ignores depth on purpose. Depth-aware overlap would be right
			// for solid animals, but these are unfilled line drawings: one
			// crossing another does not read as "behind", it reads as a single
			// illegible tangle of strokes. Keeping everyone in their own column
			// costs nothing and the tank is never ambiguous.
			for (let i = 0; i < crittersRef.current.length; i++) {
				const a = crittersRef.current[i];
				for (let j = i + 1; j < crittersRef.current.length; j++) {
					const b = crittersRef.current[j];
					const gap = Math.abs(a.x - b.x);
					const min = (a.width + b.width) / 2 * PERSONAL_SPACE;
					if (gap >= min) continue;
					// Back off along the axis that separates them.
					const push: 1 | -1 = a.x < b.x ? -1 : 1;
					a.dir = push;
					b.dir = push === 1 ? -1 : 1;
					const shove = (min - gap) / 2;
					a.x += push * shove;
					b.x -= push * shove;
					a.pauseUntil = 0;
					b.pauseUntil = 0;
					draw(a);
					draw(b);
				}
			}
			raf = requestAnimationFrame(step);
		};

		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [reduced, draw]);

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.pointerType === "touch") return; // a finger is a tap, not a hover
		const r = e.currentTarget.getBoundingClientRect();
		pointerRef.current = e.clientX - r.left;
	};
	const onPointerLeave = () => {
		pointerRef.current = null;
	};

	const tapTheGlass = () => {
		scatterUntilRef.current = performance.now() + SCATTER_MS;
		pointerRef.current = null;
		if (reduced) return;
		setShaking(true);
		window.setTimeout(() => setShaking(false), 420);
	};

	const hoveredSpecimen =
		crittersRef.current.find((c) => c.key === hovered)?.specimen ?? null;

	return (
		<div className="relative">
			<div
				ref={tankRef}
				onPointerMove={onPointerMove}
				onPointerLeave={onPointerLeave}
				data-note="the drawings are the projects' own logos, lifted straight out of their repos."
				className={
					// A shallow vitrine rather than a deep tank. Once the animals
					// are drawn at the size animals actually are, a tall tank is
					// mostly empty glass.
					"vivarium-glass relative h-[10rem] w-full overflow-hidden rounded-lg border-2 border-theme-border bg-theme-panel/40 sm:h-[12rem] " +
					(shaking ? "vivarium-shake" : "")
				}
			>
				<Substrate />

				{crittersRef.current.map((c) =>
					c.specimen ? (
						<button
							key={c.key}
							ref={(el) => {
								c.el = el;
							}}
							type="button"
							onClick={() => onOpen(c.specimen!)}
							onMouseEnter={() => setHovered(c.key)}
							onMouseLeave={() =>
								setHovered((h) => (h === c.key ? null : h))
							}
							onFocus={() => setHovered(c.key)}
							onBlur={() => setHovered((h) => (h === c.key ? null : h))}
							style={{
								width: c.width,
								height: c.width / artworkRatio(c.art),
								// Feet on the floor line, so `y` means the same
								// thing for a long lacewing and a tall bagworm.
								transformOrigin: "center bottom",
								marginTop: -(c.width / artworkRatio(c.art)),
							}}
							aria-label={`${c.specimen.name}: ${c.specimen.tagline}`}
							className="vivarium-critter absolute left-0 top-0 cursor-pointer text-theme-text-secondary transition-colors hover:text-theme-accent focus:outline-none focus-visible:text-theme-accent"
						>
							{/* At this scale the drawing itself is a smaller
							    target than a fingertip, so the hit area is
							    grown past it without changing the layout. */}
							<span aria-hidden="true" className="absolute -inset-3" />
							<Plate artwork={c.art} className="h-full w-full" />
						</button>
					) : (
						<div
							key={c.key}
							ref={(el) => {
								c.el = el;
							}}
							aria-hidden="true"
							style={{
								width: c.width,
								height: c.width / artworkRatio(c.art),
								transformOrigin: "center bottom",
								marginTop: -(c.width / artworkRatio(c.art)),
							}}
							className="vivarium-critter pointer-events-none absolute left-0 top-0 text-theme-comment/45"
						>
							<Plate artwork={c.art} className="h-full w-full" />
						</div>
					),
				)}

				{/* The label for whatever is under the cursor, pinned to the
				    tank's corner. A label that chased a walking animal would be
				    unreadable, and would cover the thing you are looking at. */}
				{hoveredSpecimen && (
					<div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10">
						<div className="bw-bubble w-fit max-w-full rounded-sm border border-theme-border bg-theme-bg/90 px-3 py-1.5 backdrop-blur-sm">
							<p className="font-display text-sm text-theme-text-primary">
								{hoveredSpecimen.name}{" "}
								<span className="font-mono text-xs italic text-theme-comment">
									{hoveredSpecimen.binomial}
								</span>
							</p>
						</div>
					</div>
				)}

				{/* glass: a sheen across the front and a highlight down one edge */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 rounded-[0.4rem] bg-gradient-to-br from-white/[0.07] via-transparent to-black/15"
				/>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/15"
				/>
			</div>

			<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
				<p className="font-mono text-xs text-theme-comment">
					{reduced
						? "reduced motion: the collection is holding still for you."
						: "click a specimen to read its card. they will get out of your way."}
				</p>
				<button
					type="button"
					onClick={tapTheGlass}
					className="shrink-0 rounded-sm border border-theme-border px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-theme-text transition hover:border-theme-accent/70 hover:bg-theme-accent/10 hover:text-theme-accent"
				>
					tap the glass
				</button>
			</div>
		</div>
	);
}

/** Moss, litter and a couple of fronds along the tank floor. Decorative. */
function Substrate() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 400 120"
			preserveAspectRatio="none"
			className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] w-full text-theme-border"
		>
			<path
				d="M0 62 C 40 50, 78 58, 116 54 C 154 50, 190 60, 230 56 C 268 52, 310 58, 348 52 C 372 48, 388 54, 400 52 L400 120 L0 120 Z"
				className="fill-current opacity-40"
			/>
			<path
				d="M0 84 C 52 76, 96 84, 148 80 C 200 76, 246 86, 300 82 C 344 78, 372 84, 400 80 L400 120 L0 120 Z"
				className="fill-current opacity-65"
			/>
			<g
				className="stroke-current opacity-35"
				fill="none"
				strokeWidth={2}
				strokeLinecap="round"
			>
				<path d="M36 62 C 30 44, 34 30, 44 20" />
				<path d="M44 20 C 38 26, 34 34, 34 44" />
				<path d="M44 20 C 50 28, 52 38, 50 48" />
				<path d="M300 58 C 296 40, 302 28, 314 18" />
				<path d="M314 18 C 306 24, 300 32, 300 42" />
				<path d="M314 18 C 320 28, 322 38, 318 46" />
				<path d="M180 60 C 176 48, 178 38, 184 32" />
				<path d="M196 58 C 200 46, 200 36, 196 30" />
			</g>
		</svg>
	);
}
