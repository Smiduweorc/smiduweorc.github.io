// The vivarium: a glass tank with the flagship projects living in it.
// Side-on drawings can only be mirrored, never turned round: turned far, one reads as an
// insect on its back. So those walk the floor. Antlion, Darter and Termite are drawn from
// above, so they climb the glass. Firefly flies.
//
// Speeds come from the animals, and they move in bursts: a tank of things gliding at a
// constant speed reads as a screensaver.
//
// One requestAnimationFrame loop writes transforms straight onto the DOM nodes. Per-frame
// React state would re-render the section sixty times a second to move some pixels.

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	Plate,
	artworkHangs,
	artworkRatio,
	type ArtworkKey,
} from "./artwork";
import { Boll, CaveInside, CaveRock, Scenery } from "./Scenery";
import { tankSpecimens, type Specimen } from "../specimens";

// Square root, not a straight line: a straight line leaves the aphid as a dot.
const PX_PER_SQRT_MM = 16;
const MIN_PX = 30; // below this the linework stops reading as legs
const FLEE_RADIUS = 130; // px: pointer closer than this and it bolts
// Panic multiplies cruising speed by up to this. A slow walker is still
// slow at three times its pace; startled insects sprint.
const FLEE_BOOST = 8;
const FLEE_DECAY = 1.1; // panic shed per second once out of range
const TURN_RATE = 1.3; // how fast a heading eases towards its target, per s
const WALL_PAD = 8;
const SCATTER_MS = 1500; // how long a tap on the glass keeps everyone running
// The dung beetle drops its ball and bolts when the pointer comes close. It
// goes back once the pointer has kept away this long, or gives up being
// scared after the longer wait and goes back anyway, braver for a while.
const BEETLE_CALM_MS = 1200;
const BEETLE_GIVE_UP_MS = 6000;
const BEETLE_BRAVE_MS = 5000;
const FLOOR_BAND = 0.3; // fraction of tank height the floor occupies
// The front of the floor, as a share of its depth, is the dung beetle's
// lane, the way the cave is its room. Everyone else walks behind it, or a
// walker crossing the beetle's line slides over and under it and its ball
// as their stacking order swaps, which reads as a tangle.
const BEETLE_LANE = 0.3;
const BACK_WALL = 0.95;
// Two animals closer than this, as a fraction of their combined size, push
// apart. These are unfilled line drawings, so one crossing another does not
// read as "behind": it reads as one illegible tangle of strokes.
const PERSONAL_SPACE = 0.6;

// The site draws its own ball so it can grow: each trip starts from a pellet and ends
// a little over two beetle lengths across.
const BEETLE_CUT = 0.33;
const BOLL_START = 0.08; // diameter as a fraction of the drawing's height
const BOLL_MAX = 0.8;
// The drawing is a beetle doing a headstand against a big ball. With a
// pellet, or nothing, it stands level on its feet; it climbs into the
// headstand as the ball grows to reach its hind legs.
const BEETLE_LEVEL_DEG = 40;
const BOLL_HEADSTAND = 0.5; // ball size, as above, at which it is fully up
// Where the hind legs meet the ball, as a share of the drawing's height up
// from the floor. Measured off the mask: they touch it between 35% and 65%.
const HIND_LEG_HEIGHT = 0.5;
// How far into the cave, as a share of the cave's width, the beetle and its
// ball go before they are lost in the dark. Both fade over that stretch.
const CAVE_DEPTH = 0.3;
const CAVE_W = 200; // px, matches the cave drawings' viewBox
const CAVE_H = 130;

type Mode = "walk" | "climb" | "fly" | "roll";

type Habit = {
	mode: Mode;
	/** Body length in mm, or wingspan for the ones drawn wings out. */
	mm: number;
	/** Cruising pace in px/s at scale 1. */
	pace: number;
	/** Seconds of moving, then seconds of standing still. */
	burst: [number, number];
	rest: [number, number];
	/** Moves like a caterpillar: bunch up, stretch out, and only gain
	 *  ground on the stretch, instead of bouncing along on legs. */
	inch?: boolean;
};

// Lengths are a typical adult of the animal the project is named after.
const HABITS: Record<string, Habit> = {
	"aphid-template": { mode: "walk", mm: 2.5, pace: 6, burst: [1, 3], rest: [2, 6] },
	mycocepurus: { mode: "walk", mm: 2.5, pace: 22, burst: [0.6, 2], rest: [0.3, 1.2] },
	cephalote: { mode: "walk", mm: 5, pace: 20, burst: [0.6, 2], rest: [0.4, 1.5] },
	"leafcutter-ant": { mode: "walk", mm: 9, pace: 26, burst: [1, 3], rest: [0.3, 1] },
	repletes: { mode: "walk", mm: 10, pace: 5, burst: [0.8, 2], rest: [3, 8] },
	termite: { mode: "climb", mm: 6, pace: 12, burst: [1, 3], rest: [0.6, 2] },
	"rove-beetle": { mode: "walk", mm: 14, pace: 34, burst: [0.5, 1.5], rest: [0.5, 2] },
	lacewing: { mode: "walk", mm: 15, pace: 10, burst: [1, 2.5], rest: [1.5, 4] },
	firefly: { mode: "fly", mm: 15, pace: 22, burst: [3, 7], rest: [0, 0] },
	"dung-beetle-template": { mode: "roll", mm: 6, pace: 18, burst: [2, 5], rest: [0.5, 1.5] },
	// The larva in its case, not the moth, and a small one: drawn on its spring
	// the drawing is mostly coil, so it is sized down past its real length.
	bagworm: { mode: "walk", mm: 7, pace: 4, burst: [1, 3], rest: [2, 5] },
	// A cotton bollworm caterpillar grows to about 4cm, but drawn full grown
	// it dwarfed the whole floor, so this one is a younger instar. The drawing
	// is curled, so it inches rather than walks.
	bollworm: { mode: "walk", mm: 18, pace: 5, burst: [3, 7], rest: [1, 3], inch: true },
	argia: { mode: "walk", mm: 35, pace: 8, burst: [0.6, 1.5], rest: [3, 7] },
	darter: { mode: "climb", mm: 55, pace: 14, burst: [0.6, 1.6], rest: [2, 6] },
	antlion: { mode: "climb", mm: 70, pace: 8, burst: [0.8, 2], rest: [2, 6] },
	phasmid: { mode: "walk", mm: 90, pace: 3, burst: [2, 5], rest: [3, 9] },
};
const DEFAULT_HABIT: Habit = { mode: "walk", mm: 10, pace: 10, burst: [1, 3], rest: [1, 3] };

type Critter = {
	key: string;
	specimen: Specimen;
	art: ArtworkKey;
	habit: Habit;
	width: number; // px at scale 1
	height: number;
	flip: 1 | -1; // -1 for a drawing that has to be turned the right way up
	depth: number; // 0 = at the glass, 1 = at the back wall; walkers move it
	x: number; // px. Walkers: feet centre. Others: body centre.
	y: number;
	heading: number; // radians. Walkers: x against depth. Others: screen.
	target: number;
	dir: 1 | -1; // which way a side view is facing
	moveUntil: number;
	restUntil: number;
	flee: number; // 0..1
	gait: number; // radians, advances with distance walked
	el: HTMLElement | null;
};

// The dung beetle's errand, as one small state machine.
type Errand = {
	/** Rolling a ball to the cave, inside it out of sight, or walking back
	 *  out empty to fetch another. Or scared off its ball, and on the way
	 *  back to it. */
	phase: "rolling" | "inside" | "emerging" | "fleeing" | "returning";
	boll: number; // diameter, px at scale 1
	growth: number; // diameter gained per px rolled, set per trip
	spin: number; // radians the ball has turned
	tilt: number; // degrees the beetle has let itself down off its head
	seen: number; // 0..1, how far out of the cave's dark the beetle is
	ballSeen: number; // the same for its ball
	parked: number;
	/** Where the dropped ball lies while the beetle is away from it. */
	ballAt: { x: number; y: number; d: number };
	/** Where the beetle stood behind the ball, to pick it up again. */
	resumeX: number;
	runDir: 1 | -1;
	scaredAt: number; // last time the pointer was close
	fledAt: number;
	braveUntil: number;
};

// The art is a fixed drawing, so the walk has to come from how the whole
// thing is moved: a small bounce and a rock, both driven by distance covered
// rather than by time. Tie a gait to the clock and a critter that has stopped
// keeps jogging on the spot.
const GAIT_PER_PX = 0.42; // radians of cycle per pixel travelled
const BOUNCE_PX = 1.2;
const ROCK_DEG = 2.2;
const BANK_DEG = 14; // the firefly's tilt into a climb or a dive

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, lo: number, hi: number) =>
	Math.min(Math.max(v, lo), hi);
/** Shortest signed turn from a to b. */
const turn = (a: number, b: number) =>
	Math.atan2(Math.sin(b - a), Math.cos(b - a));

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

// Where each animal starts across the floor's depth, and how far back the
// climbers and the flyer are drawn. Keyed by id rather than indexed, so a
// new specimen cannot silently take somebody else's line.
const TANK_DEPTH: Record<string, number> = {
	// The dung beetle has the front lane to itself; walkers are spread over
	// the floor behind it, one line each.
	"dung-beetle-template": 0.06,
	argia: 0.34,
	"leafcutter-ant": 0.4,
	lacewing: 0.46,
	"aphid-template": 0.52,
	bagworm: 0.58,
	bollworm: 0.64,
	cephalote: 0.7,
	mycocepurus: 0.76,
	"rove-beetle": 0.82,
	repletes: 0.88,
	phasmid: 0.93,
	// Climbers and the flyer: how far back they are drawn, nothing more.
	antlion: 0.5,
	darter: 0.45,
	firefly: 0.3,
	termite: 0.4,
};

/** A new heading for the next burst. Walkers keep mostly to crossing the
 *  tank and drift a little in depth; climbers go up or down the glass. */
function pickHeading(c: Critter): number {
	if (c.habit.mode === "climb") {
		return (Math.random() < 0.5 ? -Math.PI / 2 : Math.PI / 2) + rand(-0.4, 0.4);
	}
	if (c.habit.mode === "roll") return c.heading;
	// Walkers usually carry on the way they face, and turn back now and then.
	const ahead = c.dir === 1 ? 0 : Math.PI;
	const base = Math.random() < 0.7 ? ahead : ahead + Math.PI;
	return base + rand(-0.35, 0.35);
}

export function Vivarium({
	onOpen,
	spotlight,
}: {
	onOpen: (s: Specimen) => void;
	spotlight: string | null;
}) {
	const reduced = usePrefersReducedMotion();
	const tankRef = useRef<HTMLDivElement>(null);
	const crittersRef = useRef<Critter[]>([]);
	const boundsRef = useRef({ w: 0, h: 0, size: 1 });
	const pointerRef = useRef<{ x: number; y: number } | null>(null);
	const scatterUntilRef = useRef(0);
	const errandRef = useRef<Errand>({
		phase: "rolling",
		boll: 0,
		growth: 0,
		spin: 0,
		tilt: BEETLE_LEVEL_DEG,
		seen: 1,
		ballSeen: 1,
		parked: 0,
		ballAt: { x: 0, y: 0, d: 0 },
		resumeX: 0,
		runDir: -1,
		scaredAt: 0,
		fledAt: 0,
		braveUntil: 0,
	});
	const bollRef = useRef<HTMLDivElement>(null);
	const caveInsideRef = useRef<HTMLDivElement>(null);
	const caveRockRef = useRef<HTMLDivElement>(null);

	const [hovered, setHovered] = useState<string | null>(null);
	const [notes, setNotes] = useState<"on" | "fading" | "off">(() =>
		notesSeen() ? "off" : "on",
	);
	// The notes on the glass are for a first look. The first time anyone
	// does anything with the tank they fade, and that browser never sees
	// them again.
	const notesRef = useRef(notes);
	const dismissNotes = useCallback(() => {
		if (notesRef.current !== "on") return;
		notesRef.current = "fading";
		markNotesSeen();
		setNotes("fading");
		window.setTimeout(() => setNotes("off"), 700);
	}, []);
	// The loop reads the spotlight every frame, so it lives in a ref rather
	// than restarting the loop each time the pointer moves between photos.
	const spotlightRef = useRef(spotlight);
	useEffect(() => {
		spotlightRef.current = spotlight;
	}, [spotlight]);
	const [shaking, setShaking] = useState(false);
	const [parked, setParked] = useState(0);

	if (crittersRef.current.length === 0) {
		crittersRef.current = tankSpecimens().map<Critter>((s, i) => {
			const habit = HABITS[s.id] ?? DEFAULT_HABIT;
			const ratio = artworkRatio(s.art);
			const long = Math.max(MIN_PX, PX_PER_SQRT_MM * Math.sqrt(habit.mm));
			// The long axis gets the body length: the width for everything
			// drawn side-on or wings out, the height for the termite, which
			// is drawn standing up.
			let width = ratio >= 1 ? long : long * ratio;
			let height = width / ratio;
			if (habit.mode === "roll") {
				// The length is the beetle's, which is only its part of the
				// drawing.
				height = long / BEETLE_CUT / ratio;
				width = long;
			}
			const heading = habit.mode === "roll" ? 0 : i % 2 === 0 ? 0 : Math.PI;
			return {
				key: s.id,
				specimen: s,
				art: s.art,
				habit,
				width,
				height,
				flip: artworkHangs(s.art) ? -1 : 1,
				depth:
					habit.mode === "walk"
						? clamp(TANK_DEPTH[s.id] ?? 0.5, BEETLE_LANE, BACK_WALL)
						: (TANK_DEPTH[s.id] ?? 0.5),
				x: 0,
				y: 0,
				heading,
				target: heading,
				dir: Math.cos(heading) >= 0 ? 1 : -1,
				moveUntil: 0,
				restUntil: 0,
				flee: 0,
				gait: Math.random() * Math.PI * 2,
				el: null,
			};
		});
	}

	/** Feet line for a given depth: further back sits higher up the glass. */
	const floorY = useCallback((depth: number) => {
		const { h } = boundsRef.current;
		return h - WALL_PAD - depth * (h * FLOOR_BAND);
	}, []);

	const beetle = () =>
		crittersRef.current.find((c) => c.habit.mode === "roll") ?? null;

	const caveMouthX = useCallback(() => {
		const { w, size } = boundsRef.current;
		return w - CAVE_W * size * 0.78;
	}, []);

	const drawBoll = useCallback(() => {
		const b = beetle();
		const el = bollRef.current;
		if (!b || !el) return;
		const e = errandRef.current;
		const { size } = boundsRef.current;
		const scale = (1 - b.depth * 0.32) * size;
		if (e.phase === "fleeing" || e.phase === "returning") {
			const { x, y, d } = e.ballAt;
			el.style.transform = `translate3d(${x - d / 2}px, ${y - d}px, 0) rotate(${e.spin}rad)`;
			return;
		}
		if (e.phase !== "rolling") {
			el.style.opacity = "0";
			return;
		}
		el.style.opacity = String(e.ballSeen);
		const d = e.boll * scale;
		// The legs are not at the box edge: the beetle tilts about its head, so the hind legs
		// are found by turning that point through the same tilt. The legs reach a little way
		// round the ball, so the two overlap slightly.
		const t = (e.tilt * Math.PI) / 180;
		const bw = b.width * scale;
		const legUp = b.height * scale * HIND_LEG_HEIGHT;
		const back = b.x - bw / 2 + bw * Math.cos(t) + legUp * Math.sin(t);
		const cx = back + d / 2 - d * 0.06;
		el.style.width = `${d}px`;
		el.style.height = `${d}px`;
		el.style.transform = `translate3d(${cx - d / 2}px, ${b.y - d}px, 0) rotate(${e.spin}rad)`;
		e.ballAt = { x: cx, y: b.y, d };
	}, []);

	const draw = useCallback((c: Critter) => {
		if (!c.el) return;
		const { size } = boundsRef.current;
		// One transform for scale, flip, bounce and tilt, so the browser composites once.
		const scale = (1 - c.depth * 0.32) * size;
		const bounce = Math.abs(Math.sin(c.gait)) * BOUNCE_PX;
		const rock = Math.sin(c.gait * 0.5) * ROCK_DEG;

		if (c.habit.mode === "climb") {
			// Drawn head-up, so a heading of straight up is no rotation.
			const deg = (c.heading * 180) / Math.PI + 90 + rock;
			c.el.style.transform =
				`translate3d(${c.x - c.width / 2}px, ${c.y - c.height / 2}px, 0) ` +
				`rotate(${deg}deg) scale(${scale})`;
			c.el.style.zIndex = "1";
			return;
		}

		if (c.habit.mode === "fly") {
			const bank = Math.sin(c.heading) * BANK_DEG * c.dir;
			c.el.style.transform =
				`translate3d(${c.x - c.width / 2}px, ${c.y - c.height / 2 - bounce}px, 0) ` +
				`rotate(${bank}deg) scale(${scale * c.dir}, ${scale})`;
			c.el.style.zIndex = "500";
			return;
		}

		if (c.habit.inch) {
			// Bunched up and stretched out in turn, along the floor, with the
			// back end staying put: origin at the tail.
			const pull = Math.sin(c.gait);
			c.el.style.transformOrigin = c.dir === 1 ? "left bottom" : "right bottom";
			c.el.style.transform =
				`translate3d(${c.x - c.width / 2}px, ${c.y - c.height}px, 0) ` +
				`scale(${scale * c.dir * (1 + pull * 0.07)}, ${scale * (1 - pull * 0.05)})`;
			c.el.style.zIndex = String(10 + Math.round(c.y));
			return;
		}

		if (c.habit.mode === "roll") {
			// Always the drawing's own way round: it backs the ball to the
			// right and walks home head first to the left. The tilt pivots on
			// its head, at the box's bottom-left corner.
			const { tilt, seen } = errandRef.current;
			c.el.style.opacity = String(seen);
			c.el.style.visibility = seen > 0 ? "visible" : "hidden";
			c.el.style.transformOrigin = "left bottom";
			// Tipping about its head swings the back legs down through the
			// floor, so it is lifted by about as much as they drop.
			const lift = c.width * scale * Math.sin((tilt * Math.PI) / 180) * 0.4;
			c.el.style.transform =
				`translate3d(${c.x - c.width / 2}px, ${c.y - c.height - bounce - lift}px, 0) ` +
				`rotate(${tilt + rock}deg) scale(${scale})`;
			c.el.style.zIndex = String(10 + Math.round(c.y));
			return;
		}

		// Mirror a hanging drawing vertically to stand it up. The origin is the bottom edge, so
		// the box first moves down by its own height, or it reflects through the floor.
		// A horizontal flip still composes with it: two mirrors, not a rotation.
		const stand = c.flip === -1 ? ` translateY(${c.height}px)` : "";
		c.el.style.transform =
			`translate3d(${c.x - c.width / 2}px, ${c.y - c.height - bounce}px, 0) ` +
			`rotate(${rock * c.flip * c.dir}deg) ` +
			`scale(${scale * c.dir}, ${scale * c.flip})` +
			stand;
		c.el.style.zIndex = String(10 + Math.round(c.y));
	}, []);

	/** Start a trip to the cave from a pellet, sized to finish growing as it
	 *  arrives, however far away the beetle happens to be. */
	const startTrip = useCallback(
		(b: Critter) => {
			const e = errandRef.current;
			e.phase = "rolling";
			e.boll = b.height * BOLL_START;
			e.tilt = BEETLE_LEVEL_DEG;
			e.seen = 1;
			e.ballSeen = 1;
			const trip = Math.max(80, caveMouthX() - b.x);
			e.growth = (b.height * (BOLL_MAX - BOLL_START)) / trip;
			b.heading = b.target = 0;
			b.dir = 1;
		},
		[caveMouthX],
	);

	const layout = useCallback(
		(reseed: boolean) => {
			const el = tankRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			// A phone-width tank gets smaller animals rather than a pile of them.
			const size = clamp(r.width / 1200, 0.5, 1.4);
			boundsRef.current = { w: r.width, h: r.height, size };
			const list = crittersRef.current;
			const air = r.height * (1 - FLOOR_BAND);
			list.forEach((c, i) => {
				const pad = WALL_PAD + (c.width * size) / 2;
				if (reseed) {
					// Spaced across the width so nobody spawns on top of anyone.
					c.x = pad + ((i + 0.5) / list.length) * Math.max(0, r.width - pad * 2);
					if (c.habit.mode === "climb") c.y = rand(r.height * 0.15, r.height * 0.6);
					if (c.habit.mode === "fly") c.y = air * 0.35;
				}
				c.x = clamp(c.x, pad, r.width - pad);
				if (c.habit.mode === "walk" || c.habit.mode === "roll") c.y = floorY(c.depth);
				else c.y = clamp(c.y, pad, r.height - pad);
			});

			const b = beetle();
			const caveTop = (b ? b.y : r.height - WALL_PAD) - CAVE_H * size;
			for (const node of [caveInsideRef.current, caveRockRef.current]) {
				if (!node) continue;
				node.style.width = `${CAVE_W * size}px`;
				node.style.height = `${CAVE_H * size}px`;
				node.style.transform = `translate3d(${r.width - CAVE_W * size}px, ${caveTop}px, 0)`;
			}
			if (b && reseed) {
				b.x = Math.min(b.x, caveMouthX() * 0.4);
				startTrip(b);
			}
			list.forEach(draw);
			drawBoll();
		},
		[draw, drawBoll, floorY, caveMouthX, startTrip],
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
		if (reduced) return;
		let raf = 0;
		let last = performance.now();

		const step = (now: number) => {
			const dt = Math.min((now - last) / 1000, 0.05); // cap after a tab switch
			last = now;
			const { w, h, size } = boundsRef.current;
			const band = h * FLOOR_BAND;
			const scattering = now < scatterUntilRef.current;
			const pointer = pointerRef.current;
			const list = crittersRef.current;
			const mouth = caveMouthX();

			for (const c of list) {
				const { mode } = c.habit;
				const scale = (1 - c.depth * 0.32) * size;
				const padX = WALL_PAD + (c.width * scale) / 2;
				const padY = WALL_PAD + (c.height * scale) / 2;

				if (mode !== "roll") {
					if (scattering) {
						c.flee = 1;
					} else if (pointer) {
						const bodyY = mode === "walk" ? c.y - (c.height * scale) / 2 : c.y;
						const dx = c.x - pointer.x;
						const dy = bodyY - pointer.y;
						const d = Math.hypot(dx, dy);
						if (d < FLEE_RADIUS) {
							c.flee = Math.max(c.flee, 1 - d / FLEE_RADIUS);
							// Straight away from the pointer. On the floor, "up the
							// screen" is "further back", so the same angle works.
							c.target = mode === "walk" ? Math.atan2(-dy, dx) : Math.atan2(dy, dx);
						}
					}
					if (!scattering) c.flee = Math.max(0, c.flee - FLEE_DECAY * dt);
				} else {
					// The dung beetle only scares while it is out in the open
					// with a ball to lose, or on its way back to one.
					const e = errandRef.current;
					const exposed =
						e.phase === "rolling" || e.phase === "fleeing" || e.phase === "returning";
					let near = scattering;
					let from = c.x + 1;
					if (!near && pointer && exposed && now >= e.braveUntil) {
						const bodyY = c.y - (c.height * scale) / 2;
						near = Math.hypot(c.x - pointer.x, bodyY - pointer.y) < FLEE_RADIUS;
						from = pointer.x;
					}
					if (near && exposed) {
						c.flee = 1;
						e.scaredAt = now;
						if (e.phase !== "fleeing") {
							if (e.phase === "rolling") e.resumeX = c.x;
							e.phase = "fleeing";
							e.fledAt = now;
							e.tilt = BEETLE_LEVEL_DEG;
						}
						e.runDir = c.x < from ? -1 : 1;
					} else {
						// Still a little jumpy on the way back: it hurries to
						// the ball rather than stopping for a rest on the way.
						const floor = e.phase === "returning" ? 0.3 : 0;
						c.flee = Math.max(floor, c.flee - FLEE_DECAY * dt);
					}
				}

				// Being looked at on the page: hold still and calm down, so it
				// can be found.
				if (c.key === spotlightRef.current) {
					c.flee = 0;
					c.restUntil = Math.max(c.restUntil, now + 250);
				}

				// Bursts: move for a while, stand still for a while. A scare
				// cuts any rest short.
				const scared = c.flee > 0.05;
				if (!scared && now >= c.moveUntil && now >= c.restUntil) {
					c.restUntil = now + rand(...c.habit.rest) * 1000;
					c.moveUntil = c.restUntil + rand(...c.habit.burst) * 1000;
					c.target = pickHeading(c);
				}
				const resting = !scared && now < c.restUntil;

				// Heading eases round, at rest too, so an animal turns on the
				// spot before setting off rather than snapping about.
				c.heading +=
					turn(c.heading, c.target) * Math.min(1, TURN_RATE * dt * (1 + c.flee * 3));
				const vx = Math.cos(c.heading);
				const vy = Math.sin(c.heading);
				// A side view only turns round once it is clearly heading the
				// other way, or it flickers while walking straight back.
				if (mode !== "climb" && mode !== "roll" && Math.abs(vx) > 0.3) {
					c.dir = vx > 0 ? 1 : -1;
				}

				if (resting) {
					draw(c);
					continue;
				}

				const speed = c.habit.pace * size * (1 + (FLEE_BOOST - 1) * c.flee);
				let travelled = speed * dt;
				if (c.habit.inch) {
					// One bunch-and-stretch a second or so, faster when scared,
					// and ground is only gained while stretching out.
					c.gait += dt * 5 * (1 + c.flee * 2);
					travelled *= Math.max(0, Math.cos(c.gait)) * 2.6;
				} else {
					// Smaller animals take quicker steps, so the cycle scales
					// with how big the drawing is rather than being the same.
					c.gait += (travelled * GAIT_PER_PX * 40) / c.width;
				}

				if (mode === "walk") {
					c.x += vx * travelled;
					c.depth += (vy * travelled * 0.5) / band;
					// The glass, and the cave mouth, which is the dung beetle's,
					// so it is the right-hand wall for everyone else.
					const right = mouth - padX;
					if (c.x <= padX || c.x >= right) {
						c.x = clamp(c.x, padX, right);
						c.target = c.x <= padX ? rand(-0.3, 0.3) : Math.PI + rand(-0.3, 0.3);
					}
					if (c.depth <= BEETLE_LANE || c.depth >= BACK_WALL) {
						c.depth = clamp(c.depth, BEETLE_LANE, BACK_WALL);
						c.target = -c.target;
					}
					c.y = floorY(c.depth);
				} else if (mode === "climb" || mode === "fly") {
					c.x += vx * travelled;
					c.y += vy * travelled;
					const top = mode === "fly" ? padY + h * 0.05 : padY;
					const bottom = mode === "fly" ? h - band - padY : h - padY;
					if (c.x <= padX || c.x >= w - padX) {
						c.x = clamp(c.x, padX, w - padX);
						c.target = Math.PI - c.heading;
					}
					if (c.y <= top || c.y >= bottom) {
						c.y = clamp(c.y, top, bottom);
						c.target = -c.heading;
					}
					// The firefly wanders by small changes of course, not by
					// picking a new direction out of nowhere.
					if (mode === "fly" && Math.random() < dt * 0.8) {
						c.target = c.heading + rand(-0.9, 0.9);
					}
				} else {
					roll(c, travelled, now);
				}
				draw(c);
			}

			// Anyone who has walked into someone steps aside. Done after
			// everything has moved, so each pair sees the same gap.
			for (let i = 0; i < list.length; i++) {
				const a = list[i];
				for (let j = i + 1; j < list.length; j++) {
					const b = list[j];
					if ((a.habit.mode === "fly") !== (b.habit.mode === "fly")) continue;
					const dx = b.x - a.x;
					const dy = b.y - a.y;
					const gap = Math.hypot(dx, dy);
					const min =
						((Math.max(a.width, a.height) + Math.max(b.width, b.height)) / 2) *
						size *
						PERSONAL_SPACE;
					if (gap >= min || gap === 0) continue;
					const away = Math.atan2(dy, dx);
					for (const [c, sign] of [
						[a, -1],
						[b, 1],
					] as const) {
						if (c.habit.mode === "roll") continue;
						const shove = ((min - gap) / 2) * sign;
						c.x += Math.cos(away) * shove;
						if (c.habit.mode === "walk") {
							c.depth = clamp(
								c.depth - (Math.sin(away) * shove) / band,
								BEETLE_LANE,
								BACK_WALL,
							);
							c.y = floorY(c.depth);
						} else {
							c.y += Math.sin(away) * shove;
						}
						draw(c);
					}
				}
			}
			drawBoll();
			raf = requestAnimationFrame(step);
		};

		// The dung beetle's day: pick up a pellet, back it towards the cave
		// while it grows, take it inside and out of sight, wait, then walk
		// back out empty-handed for the next.
		const roll = (c: Critter, travelled: number, now: number) => {
			const e = errandRef.current;
			const { w, size } = boundsRef.current;
			const scale = (1 - c.depth * 0.32) * size;
			const half = (c.width * scale) / 2;
			const mouth = caveMouthX();
			const dark = CAVE_W * size * CAVE_DEPTH;
			/** 1 outside the cave, falling to 0 at CAVE_DEPTH inside it. */
			const outside = (x: number) => clamp(1 - (x - mouth) / dark, 0, 1);

			if (e.phase === "rolling") {
				const effort = 1 - (e.boll / c.height - BOLL_START) * 0.8;
				const step = travelled * effort;
				c.heading = c.target = 0;
				c.x += step;
				e.boll = Math.min(c.height * BOLL_MAX, e.boll + step * e.growth);
				e.spin += step / Math.max(1, (e.boll * scale) / 2);
				const up = clamp(
					(e.boll / c.height - BOLL_START) / (BOLL_HEADSTAND - BOLL_START),
					0,
					1,
				);
				e.tilt = BEETLE_LEVEL_DEG * (1 - up);
				const ballX = c.x + half + (e.boll * scale) / 2;
				e.ballSeen = outside(ballX);
				e.seen = outside(c.x);
				if (e.seen === 0) {
					e.phase = "inside";
					e.parked += 1;
					setParked(e.parked);
					c.restUntil = now + rand(2.5, 5) * 1000;
					c.moveUntil = c.restUntil + 60_000;
				}
			} else if (e.phase === "fleeing") {
				c.x = clamp(c.x + e.runDir * travelled, WALL_PAD + half, mouth - half);
				const calm = now - e.scaredAt > BEETLE_CALM_MS;
				const bored = now - e.fledAt > BEETLE_GIVE_UP_MS;
				if (calm || bored) {
					e.phase = "returning";
					if (bored) e.braveUntil = now + BEETLE_BRAVE_MS;
				}
			} else if (e.phase === "returning") {
				// Back to the ball, then on with the job exactly where it
				// was left: same ball, same size, same tilt.
				const gap = e.resumeX - c.x;
				if (Math.abs(gap) <= travelled) {
					c.x = e.resumeX;
					e.phase = "rolling";
				} else {
					c.x += Math.sign(gap) * travelled;
				}
			} else if (e.phase === "inside") {
				e.phase = "emerging";
				e.tilt = BEETLE_LEVEL_DEG;
				c.heading = c.target = Math.PI;
			} else {
				c.x -= travelled * 1.6;
				e.seen = outside(c.x);
				const home = Math.max(WALL_PAD + half, mouth - w * 0.5);
				if (c.x <= home) {
					startTrip(c);
					c.restUntil = now + rand(1, 2) * 1000;
					c.moveUntil = c.restUntil + 60_000;
				}
			}
			c.y = floorY(c.depth);
		};

		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [reduced, draw, drawBoll, floorY, caveMouthX, startTrip]);

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.pointerType === "touch") return; // a finger is a tap, not a hover
		dismissNotes();
		const r = e.currentTarget.getBoundingClientRect();
		pointerRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
	};
	const onPointerLeave = () => {
		pointerRef.current = null;
	};

	const tapTheGlass = () => {
		dismissNotes();
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
				onPointerDown={dismissNotes}
				data-note="the drawings are the projects' own logos, lifted straight out of their repos. the plants are stand-ins."
				className={
					// isolate: the animals restack by z-index every frame, and
					// without a stacking context of its own those numbers would
					// outrank the greeting, the card and anything else fixed
					// over the page.
					"vivarium-glass isolate relative h-[min(clamp(22rem,44vw,40rem),62vh)] w-full overflow-hidden border-y border-theme-border bg-theme-panel/40 " +
					(shaking ? "vivarium-shake" : "")
				}
			>
				<Scenery />

				<div
					ref={caveInsideRef}
					className="pointer-events-none absolute left-0 top-0 z-[5]"
				>
					<CaveInside parked={parked} />
				</div>
				<div
					ref={bollRef}
					aria-hidden="true"
					className="pointer-events-none absolute left-0 top-0 text-theme-text-secondary"
					style={{ zIndex: 9999, opacity: 0 }}
				>
					<Boll />
				</div>
				<div
					ref={caveRockRef}
					className="pointer-events-none absolute left-0 top-0 text-theme-border"
					style={{ zIndex: 10000 }}
				>
					<CaveRock />
				</div>

				{crittersRef.current.map((c) => (
					<button
						key={c.key}
						ref={(el) => {
							c.el = el;
						}}
						type="button"
						onClick={() => onOpen(c.specimen)}
						onMouseEnter={() => setHovered(c.key)}
						onMouseLeave={() => setHovered((h) => (h === c.key ? null : h))}
						onFocus={() => setHovered(c.key)}
						onBlur={() => setHovered((h) => (h === c.key ? null : h))}
						style={{
							width: c.width,
							height: c.height,
							transformOrigin:
								c.habit.mode === "walk" || c.habit.mode === "roll"
									? "center bottom"
									: "center center",
						}}
						aria-label={`${c.specimen.name}: ${c.specimen.tagline}`}
						className={
							"vivarium-critter absolute left-0 top-0 cursor-pointer transition-colors hover:text-theme-accent focus-visible:text-theme-accent " +
							(spotlight === c.key ? "text-theme-accent" : "text-theme-text-secondary")
						}
					>
						{/* At this scale the drawing itself is a smaller target
						    than a fingertip, so the hit area is grown past it
						    without changing the layout. */}
						<span aria-hidden="true" className="absolute -inset-3" />
						{c.habit.mode === "roll" ? (
							// Only the beetle's part of the drawing: the ball is
							// drawn separately so it can grow.
							<span className="block h-full w-full overflow-hidden">
								<Plate
									artwork={c.art}
									className="h-full"
									style={{ width: c.width / BEETLE_CUT }}
								/>
							</span>
						) : (
							<Plate artwork={c.art} className="h-full w-full" />
						)}
					</button>
				))}

				{notes !== "off" && <Annotations fading={notes === "fading"} />}

				{/* The label for whatever is under the cursor, pinned to the
				    tank's corner. A label that chased a walking animal would be
				    unreadable, and would cover the thing you are looking at. */}
				{hoveredSpecimen && (
					<div className="pointer-events-none absolute left-4 top-4 z-[20000]">
						<div className="bw-bubble w-fit max-w-full rounded-sm border border-theme-border bg-theme-bg px-3 py-1.5">
							<p className="font-display text-base text-theme-text-primary">
								{hoveredSpecimen.name}{" "}
								<span className="text-sm italic text-theme-comment">
									{hoveredSpecimen.binomial}
								</span>
							</p>
						</div>
					</div>
				)}
			</div>

			{/* Right padding keeps the button clear of the fixed tools in the
			    bottom-right corner, which sit over this row on first load. */}
			<div className="flex flex-wrap items-center justify-between gap-3 px-[max(4vmin,20px)] pr-24 pt-4">
				{/* Left empty, the line still holds the button on the right when there is
				    nothing to say. */}
				<p className="text-sm text-theme-comment">
					{reduced && "Reduced motion is on, so the collection is holding still."}
				</p>
				<button
					type="button"
					onClick={tapTheGlass}
					className="shrink-0 rounded-sm border border-theme-border px-3 py-1.5 text-sm text-theme-text transition-colors hover:border-theme-accent/70 hover:text-theme-accent"
				>
					Tap the glass
				</button>
			</div>
		</div>
	);
}

const NOTES_KEY = "smiduweorc-glass-notes-seen";

function notesSeen(): boolean {
	try {
		return localStorage.getItem(NOTES_KEY) === "1";
	} catch {
		// Storage blocked: show them, and they go after the first touch as
		// usual. Worst case they come back next visit.
		return false;
	}
}

function markNotesSeen(): void {
	try {
		localStorage.setItem(NOTES_KEY, "1");
	} catch {
		// nothing to do; see notesSeen
	}
}

/** Notes written on the glass in the journal's pen, with an arrow each. Too
 *  small to be worth reading on a phone, so they only appear from tablet
 *  width up. */
function Annotations({ fading }: { fading: boolean }) {
	const pen = "font-hand text-sm leading-snug text-theme-text-secondary";
	return (
		<div
			aria-hidden="true"
			className={
				"pointer-events-none absolute inset-0 z-[20001] hidden transition-opacity duration-700 md:block " +
				(fading ? "opacity-0" : "opacity-100")
			}
		>
			<div className="absolute bottom-[24%] right-[9%] w-44 -rotate-3 text-right">
				<p className={pen}>the dung beetle's stash. go on, count them.</p>
				<svg viewBox="0 0 60 60" className="ml-auto mr-0 mt-1 h-10 w-10 text-theme-text-secondary" fill="none">
					<path
						d="M40 4 C 46 20, 44 36, 30 52"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<path d="M24 44 L 30 52 L 38 47" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</div>
			<div className="absolute left-[17%] top-[7%] w-48 rotate-2">
				<svg viewBox="0 0 60 40" className="h-8 w-12 text-theme-text-secondary" fill="none">
					<path
						d="M56 34 C 40 30, 22 22, 8 8"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<path d="M8 18 L 8 8 L 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
				<p className={pen}>the plants are stand-ins. the animals are not.</p>
			</div>
		</div>
	);
}
