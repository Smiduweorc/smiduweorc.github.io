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
import { usePrefersReducedMotion } from "../media";
import { SpecimenLink } from "../SpecimenLink";
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

// An animal that has been sent somewhere goes at least this fast, in px/s at
// scale 1. At its own pace the stick insect takes minutes to cross the tank.
const GOAL_PACE = 90;
const GOAL_REACH = 14; // px: close enough to have arrived
const CRUMB_GRAVITY = 900; // px/s^2
const EAT_MS = 1600; // standing over a crumb, eating it
const CRUMB_GONE_MS = 450; // matches the shrink on .vivarium-crumb
const STAND_MS = 1200; // how long a twig or a guard holds after the scare
const SWAY_RATE = 2.4; // radians per second
const SWAY_DEG = 4;
const SHED_SCARE = 0.3; // how hard a start it takes to leave a skin behind
const SKIN_LASTS_MS = 15_000;
const SKIN_FADE_MS = 2000;
const MAX_COPIES = 2;
// Crumbs in the tank at once. More and the floor turns into a paper pile and
// the line under the glass cannot keep up with who ate what.
const MAX_CRUMBS = 3;
// Cephalote's nest door, in the left wall at the back of the floor. Sized
// off the ant: the head is the left half of the drawing and nearly its full
// height, and the door is just big enough for it.
const NEST_W = 0.55; // of the ant's width
const NEST_H = 1.05; // of its height
// The door is dug at one depth on the floor, and the guard always backs into
// it there, so it never plugs it from above or below the doorway.
const NEST_DEPTH = 0.45;
// Side-on drawings are taken to face right. These have their head on the
// left, so they are mirrored to walk head first.
const DRAWN_FACING_LEFT = new Set(["cephalote"]);
// A trip that has not arrived by now is given up: something kept the animal
// from getting there (on a crowded phone-width floor, usually the others).
const GOAL_GIVE_UP_MS = 12_000;
const DRAG_START_PX = 6; // less than this is a click with a shaky hand

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
	/** What it does instead of running when something comes close. A stick
	 *  insect holds still and sways, like the twig it is passing for. A
	 *  turtle ant turns its head to whatever is coming and stays put, the way
	 *  it plugs the nest door. */
	stand?: "twig" | "guard";
	/** Leaves its old skin where it stood when it bolts, as a damselfly
	 *  leaves one on the reed. */
	sheds?: boolean;
	/** A clonal ant: feed it and there is another, up to MAX_COPIES. */
	clones?: boolean;
};

// Lengths are a typical adult of the animal the project is named after.
const HABITS: Record<string, Habit> = {
	"aphid-template": { mode: "walk", mm: 2.5, pace: 6, burst: [1, 3], rest: [2, 6] },
	mycocepurus: { mode: "walk", mm: 2.5, pace: 22, burst: [0.6, 2], rest: [0.3, 1.2], clones: true },
	cephalote: { mode: "walk", mm: 5, pace: 20, burst: [0.6, 2], rest: [0.4, 1.5], stand: "guard" },
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
	argia: { mode: "walk", mm: 35, pace: 8, burst: [0.6, 1.5], rest: [3, 7], sheds: true },
	darter: { mode: "climb", mm: 55, pace: 14, burst: [0.6, 1.6], rest: [2, 6] },
	antlion: { mode: "climb", mm: 70, pace: 8, burst: [0.8, 2], rest: [2, 6] },
	phasmid: { mode: "walk", mm: 90, pace: 3, burst: [2, 5], rest: [3, 9], stand: "twig" },
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
	/** Somewhere it has been sent: to a crumb, or to the glass by name. */
	goal: Goal | null;
	stillUntil: number; // a twig or a guard holding its ground
	sway: number; // radians, and only while a twig is holding still
	/** A copy that has not come out yet. */
	hidden: boolean;
	el: HTMLElement | null;
};

type Goal = {
	x: number;
	/** Walkers are sent to a depth on the floor, the rest to a height. */
	depth: number;
	y: number;
	/** performance.now() after which the trip is abandoned. */
	until: number;
	onArrive: (now: number) => void;
	onGiveUp: () => void;
};

type Crumb = {
	id: number;
	specimen: Specimen;
	label: string;
	x: number;
	y: number;
	vy: number;
	floor: number; // the y it comes to rest at
	depth: number;
	landed: boolean;
	eatenAt: number; // 0 until someone gets to it
	el: HTMLElement | null;
};

// The dung beetle has a ball to roll and does not stop for anything else.
const FEEDERS = tankSpecimens().filter(
	(s) => s.crumb && HABITS[s.id]?.mode !== "roll",
);
const TRAY_SLOTS = 3;

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
	const crumbsRef = useRef<Crumb[]>([]);
	const nestRef = useRef<HTMLDivElement>(null);
	const crumbIdRef = useRef(0);
	const skinRef = useRef<HTMLDivElement>(null);
	// When the shed skin starts to fade, and when another may be left.
	const skinTimesRef = useRef({ fadeAt: 0, readyAt: 0 });
	const bollRef = useRef<HTMLDivElement>(null);
	const caveInsideRef = useRef<HTMLDivElement>(null);
	const caveRockRef = useRef<HTMLDivElement>(null);

	const [hovered, setHovered] = useState<string | null>(null);
	// The notes on the glass are for a first look. The first time anyone
	// does anything with the tank they fade, and that browser never sees
	// them again. Off in the prerendered HTML, which cannot know.
	const [notes, setNotes] = useState<"on" | "fading" | "off">("off");
	const notesRef = useRef(notes);
	useLayoutEffect(() => {
		if (notesSeen()) return;
		notesRef.current = "on";
		setNotes("on");
	}, []);
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
	const [dark, setDark] = useState(false);
	// Someone tried to catch Argia's old skin.
	const [fooled, setFooled] = useState(false);
	// What just happened in the tank, in words, under the glass.
	const [said, setSaid] = useState("");
	// Which crumbs are on offer, as indexes into FEEDERS, and the next one
	// along. In order rather than shuffled, so the prerendered tray matches.
	const [tray, setTray] = useState(() => ({
		slots: Array.from({ length: TRAY_SLOTS }, (_, i) => i),
		next: TRAY_SLOTS,
	}));
	// How many crumbs are in the tank, kept in step with crumbsRef so the
	// list renders and the tray knows when it is full.
	const [crumbCount, setCrumbCount] = useState(0);
	const [shaking, setShaking] = useState(false);
	const [parked, setParked] = useState(0);
	// Where everything stands depends on the tank's width, so the prerendered
	// HTML has them all stacked in one corner. They stay out of sight until
	// they have been put somewhere.
	const [placed, setPlaced] = useState(false);

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
				goal: null,
				stillUntil: 0,
				sway: 0,
				hidden: false,
				el: null,
			};
		});
		for (const c of crittersRef.current.filter((c) => c.habit.clones)) {
			for (let n = 1; n <= MAX_COPIES; n++) {
				crittersRef.current.push({ ...c, key: `${c.key}-copy-${n}`, hidden: true });
			}
		}
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
		c.el.style.display = c.hidden ? "none" : "";
		if (c.hidden) return;
		const { size } = boundsRef.current;
		// One transform for scale, flip, bounce and tilt, so the browser composites once.
		const scale = (1 - c.depth * 0.32) * size;
		const bounce = Math.abs(Math.sin(c.gait)) * BOUNCE_PX;
		const rock = c.sway
			? Math.sin(c.sway) * SWAY_DEG
			: Math.sin(c.gait * 0.5) * ROCK_DEG;

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
		const face = DRAWN_FACING_LEFT.has(c.specimen.id) ? -c.dir : c.dir;
		c.el.style.transform =
			`translate3d(${c.x - c.width / 2}px, ${c.y - c.height - bounce}px, 0) ` +
			`rotate(${rock * c.flip * face}deg) ` +
			`scale(${scale * face}, ${scale * c.flip})` +
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
			// The copies come last and start hidden, so they take no place.
			const out = list.filter((c) => !c.hidden).length;
			list.forEach((c, i) => {
				const pad = WALL_PAD + (c.width * size) / 2;
				if (reseed && !c.hidden) {
					// Spaced across the width so nobody spawns on top of anyone.
					c.x = pad + ((i + 0.5) / out) * Math.max(0, r.width - pad * 2);
					if (c.habit.mode === "climb") c.y = rand(r.height * 0.15, r.height * 0.6);
					if (c.habit.mode === "fly") c.y = air * 0.35;
				}
				c.x = clamp(c.x, pad, r.width - pad);
				if (c.habit.mode === "walk" || c.habit.mode === "roll") c.y = floorY(c.depth);
				else c.y = clamp(c.y, pad, r.height - pad);
			});

			const guard = list.find((c) => c.habit.stand === "guard");
			if (guard && nestRef.current) {
				const s = (1 - NEST_DEPTH * 0.32) * size;
				const n = nestRef.current;
				const nh = guard.height * NEST_H * s;
				n.style.width = `${guard.width * NEST_W * s}px`;
				n.style.height = `${nh}px`;
				n.style.transform = `translate3d(0, ${floorY(NEST_DEPTH) - nh}px, 0)`;
			}

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
		setPlaced(true);
	}, [layout]);

	const drawCrumb = useCallback((k: Crumb) => {
		if (!k.el) return;
		k.el.style.transform = `translate3d(${k.x}px, ${k.y}px, 0) translate(-50%, -100%)`;
		// index.css shrinks the scrap inside once this is set.
		k.el.toggleAttribute("data-eaten", k.eatenAt > 0);
	}, []);

	/** Bring out one more of a clonal animal, beside the one that just ate.
	 *  False once they are all out. */
	const copyOf = useCallback((parent: Critter, now: number): boolean => {
		const copy = crittersRef.current.find(
			(c) => c.hidden && c.specimen === parent.specimen,
		);
		if (!copy) return false;
		copy.hidden = false;
		copy.x = parent.x;
		copy.y = parent.y;
		copy.depth = parent.depth;
		copy.dir = parent.dir === 1 ? -1 : 1;
		copy.heading = copy.target = copy.dir === 1 ? 0 : Math.PI;
		copy.restUntil = 0;
		copy.moveUntil = now + 1500;
		return true;
	}, []);

	const ate = useCallback((c: Critter, label: string, copied: boolean) => {
		setSaid(
			`${c.specimen.name} ate "${label}". Its diet: ${c.specimen.taxonomy.diet}.` +
				(copied ? " Now there is another one of it." : ""),
		);
	}, []);

	/** Send the crumb's eater over to it. Everyone else carries on. */
	const callToCrumb = useCallback((k: Crumb, now: number) => {
		const eater = crittersRef.current.find((c) => c.key === k.specimen.id);
		if (!eater) return;
		const { h, size } = boundsRef.current;
		const half = (eater.height * (1 - eater.depth * 0.32) * size) / 2;
		eater.goal = {
			x: k.x,
			depth: k.depth,
			y: Math.min(k.floor - half, h - WALL_PAD - half),
			until: now + GOAL_GIVE_UP_MS,
			onGiveUp: () => {
				k.eatenAt = performance.now();
				drawCrumb(k);
				setSaid(`${eater.specimen.name} lost interest in "${k.label}".`);
			},
			onArrive: (now) => {
				k.eatenAt = now;
				drawCrumb(k);
				ate(eater, k.label, !!eater.habit.clones && copyOf(eater, now));
			},
		};
	}, [ate, copyOf, drawCrumb]);

	/** `at` is where a dragged crumb was let go, in tank pixels. A crumb that
	 *  was only clicked falls from the lid, somewhere along the floor. */
	const dropCrumb = (slot: number, at?: { x: number; y: number }) => {
		const specimen = FEEDERS[tray.slots[slot]];
		const eater = crittersRef.current.find((c) => c.key === specimen?.id);
		if (!specimen?.crumb || !eater) return;
		if (crumbsRef.current.length >= MAX_CRUMBS) return;
		dismissNotes();
		setTray(({ slots, next }) => {
			// The next one along that is neither on offer nor already in the tank.
			let i = next;
			const busy = (n: number) =>
				slots.includes(n) ||
				crumbsRef.current.some((k) => k.specimen === FEEDERS[n]);
			for (let tries = 0; tries < FEEDERS.length && busy(i % FEEDERS.length); tries++) i++;
			return {
				slots: slots.map((s, n) => (n === slot ? i % FEEDERS.length : s)),
				next: i + 1,
			};
		});
		if (reduced) {
			// Nothing walks under reduced motion, so the meal is only reported.
			ate(eater, specimen.crumb, false);
			return;
		}
		const { w, size } = boundsRef.current;
		const walker = eater.habit.mode === "walk";
		const pad = WALL_PAD + (eater.width * size) / 2;
		// Walkers cannot pass the cave mouth, so nothing for them lands beyond it.
		const right = (walker ? caveMouthX() : w) - pad;
		const depth = walker ? eater.depth : 0.5;
		crumbsRef.current.push({
			id: ++crumbIdRef.current,
			specimen,
			label: specimen.crumb,
			x: clamp(at?.x ?? rand(pad, right), pad, Math.max(pad, right)),
			y: at?.y ?? 0,
			vy: 0,
			floor: floorY(depth),
			depth,
			landed: false,
			eatenAt: 0,
			el: null,
		});
		setCrumbCount(crumbsRef.current.length);
	};

	/** Leave a still copy of the animal where it stands. */
	const shed = useCallback((c: Critter, now: number) => {
		const skin = skinRef.current;
		const times = skinTimesRef.current;
		if (!skin || !c.el || now < times.readyAt) return;
		skin.style.transition = "none";
		skin.style.transform = c.el.style.transform;
		skin.style.zIndex = String(Number(c.el.style.zIndex) - 1);
		skin.style.opacity = "0.45";
		skin.style.pointerEvents = "auto";
		times.fadeAt = now + SKIN_LASTS_MS;
		times.readyAt = times.fadeAt + SKIN_FADE_MS;
	}, []);

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

			for (const k of crumbsRef.current) {
				if (k.landed) continue;
				k.vy += CRUMB_GRAVITY * dt;
				k.y = Math.min(k.floor, k.y + k.vy * dt);
				if (k.y >= k.floor) {
					k.landed = true;
					callToCrumb(k, now);
				}
				drawCrumb(k);
			}
			const left = crumbsRef.current.filter(
				(k) => !k.eatenAt || now - k.eatenAt < CRUMB_GONE_MS,
			);
			if (left.length !== crumbsRef.current.length) {
				crumbsRef.current = left;
				setCrumbCount(crumbsRef.current.length);
			}
			const skin = skinTimesRef.current;
			if (skin.fadeAt && now >= skin.fadeAt && skinRef.current) {
				skinRef.current.style.transition = `opacity ${SKIN_FADE_MS}ms`;
				skinRef.current.style.opacity = "0";
				skinRef.current.style.pointerEvents = "none";
				skin.fadeAt = 0;
			}

			for (const c of list) {
				if (c.hidden) continue;
				const { mode } = c.habit;
				const scale = (1 - c.depth * 0.32) * size;
				const padX = WALL_PAD + (c.width * scale) / 2;
				const padY = WALL_PAD + (c.height * scale) / 2;

				if (mode !== "roll") {
					const wasCalm = c.flee <= 0.05;
					// How close the scare is, 0 to 1, and which way it lies.
					let scare = scattering ? 1 : 0;
					let dx = 0;
					let dy = 0;
					if (!scattering && pointer) {
						const bodyY = mode === "walk" ? c.y - (c.height * scale) / 2 : c.y;
						dx = c.x - pointer.x;
						dy = bodyY - pointer.y;
						scare = Math.max(0, 1 - Math.hypot(dx, dy) / FLEE_RADIUS);
					}
					if (c.habit.stand === "twig") {
						if (scare > 0) c.stillUntil = now + STAND_MS;
					} else if (c.habit.stand === "guard") {
						// A turtle ant runs home, backs in, and plugs the door
						// from the inside with its head, facing out, until it is
						// quiet. Backed in, its body is past the tank's left
						// edge and only the head shows in the doorway. Standing
						// still skips the wall clamp, so it can stay there.
						const doorScale = (1 - NEST_DEPTH * 0.32) * size;
						const home = WALL_PAD + (c.width * doorScale) / 2;
						const plug = (t: number) => {
							c.depth = NEST_DEPTH;
							c.y = floorY(NEST_DEPTH);
							c.x = c.width * doorScale * (NEST_W - 0.5);
							c.stillUntil = t + STAND_MS;
							c.heading = c.target = 0;
							c.dir = 1;
						};
						const atDoor = c.x - home < 4 && Math.abs(c.depth - NEST_DEPTH) < 0.05;
						if (scare > 0 && atDoor) {
							plug(now);
						} else if (scare > 0 && !c.goal) {
							c.goal = {
								x: home,
								depth: NEST_DEPTH,
								y: floorY(NEST_DEPTH),
								until: now + GOAL_GIVE_UP_MS,
								onArrive: (t) => {
									plug(t);
									setSaid(`${c.specimen.name} has plugged the nest door with its head.`);
								},
								onGiveUp: () => {},
							};
						}
					} else if (scattering) {
						c.flee = 1;
					} else if (scare > 0) {
						c.flee = Math.max(c.flee, scare);
						// Straight away from the pointer. On the floor, "up the
						// screen" is "further back", so the same angle works.
						c.target = mode === "walk" ? Math.atan2(-dy, dx) : Math.atan2(dy, dx);
					}
					if (!scattering) c.flee = Math.max(0, c.flee - FLEE_DECAY * dt);
					if (c.habit.sheds && wasCalm && c.flee > SHED_SCARE) shed(c, now);
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

				const scared = c.flee > 0.05;
				const standing = now < c.stillUntil;
				if (standing) {
					c.restUntil = Math.max(c.restUntil, c.stillUntil);
					if (c.habit.stand === "twig") c.sway += dt * SWAY_RATE;
				} else {
					c.sway = 0;
				}

				// Sent somewhere: no rests on the way, and a scare or a stand
				// only interrupts the trip.
				if (c.goal && now > c.goal.until) {
					const gaveUp = c.goal;
					c.goal = null;
					gaveUp.onGiveUp();
				}
				const goal = c.goal;
				const going = !!goal && !scared && !standing;
				if (goal && going) {
					const gx = goal.x - c.x;
					const gy = mode === "walk" ? (goal.depth - c.depth) * band : goal.y - c.y;
					if (Math.hypot(gx, gy) <= Math.max(GOAL_REACH, c.width * scale * 0.35)) {
						c.goal = null;
						c.restUntil = c.moveUntil = now + EAT_MS;
						goal.onArrive(now);
					} else {
						// A walker covers depth at half the rate it covers
						// ground, so the depth leg counts double.
						c.target = mode === "walk" ? Math.atan2(gy * 2, gx) : Math.atan2(gy, gx);
						c.restUntil = 0;
						c.moveUntil = now + 500;
					}
				}

				// Bursts: move for a while, stand still for a while. A scare
				// cuts any rest short.
				if (!scared && now >= c.moveUntil && now >= c.restUntil) {
					c.restUntil = now + rand(...c.habit.rest) * 1000;
					c.moveUntil = c.restUntil + rand(...c.habit.burst) * 1000;
					c.target = pickHeading(c);
				}
				const resting = !scared && now < c.restUntil;

				// Heading eases round, at rest too, so an animal turns on the
				// spot before setting off rather than snapping about.
				c.heading +=
					turn(c.heading, c.target) *
					Math.min(1, TURN_RATE * dt * (1 + c.flee * 3) * (going || standing ? 4 : 1));
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

				const pace = going ? Math.max(c.habit.pace, GOAL_PACE) : c.habit.pace;
				const speed = pace * size * (1 + (FLEE_BOOST - 1) * c.flee);
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
					// The firefly keeps to the air unless it has been called down.
					const bottom = mode === "fly" && !going ? h - band - padY : h - padY;
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
				if (a.hidden) continue;
				for (let j = i + 1; j < list.length; j++) {
					const b = list[j];
					if (b.hidden) continue;
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
						// The beetle is busy, and an animal on its way somewhere
						// does the stepping round, or two can hold it off for good.
						if (c.habit.mode === "roll" || c.goal || now < c.stillUntil) continue;
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
	}, [reduced, draw, drawBoll, drawCrumb, callToCrumb, shed, floorY, caveMouthX, startTrip]);

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
				data-placed={placed || undefined}
				data-lights={dark ? "out" : undefined}
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

				{/* Cephalote's door. Drawn here, like the cave, as a stand-in. */}
				<div
					ref={nestRef}
					aria-hidden="true"
					className="vivarium-prop pointer-events-none absolute left-0 top-0 z-[5] text-theme-border"
				>
					<svg viewBox="0 0 26 20" className="h-full w-full" preserveAspectRatio="none">
						<path d="M0 20 L0 1 C 10 0, 24 5, 25 20 Z" className="fill-theme-bg" />
						<path
							d="M0 1 C 10 0, 24 5, 25 20"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							vectorEffect="non-scaling-stroke"
						/>
					</svg>
				</div>
				<div
					ref={caveInsideRef}
					className="vivarium-prop pointer-events-none absolute left-0 top-0 z-[5]"
				>
					<CaveInside parked={parked} />
				</div>
				<div
					ref={bollRef}
					aria-hidden="true"
					className="vivarium-prop pointer-events-none absolute left-0 top-0 text-theme-text-secondary"
					style={{ zIndex: 9999, opacity: 0 }}
				>
					<Boll />
				</div>
				<div
					ref={caveRockRef}
					className="vivarium-prop pointer-events-none absolute left-0 top-0 text-theme-border"
					style={{ zIndex: 10000 }}
				>
					<CaveRock />
				</div>

				{crittersRef.current.map((c) => (
					<SpecimenLink
						key={c.key}
						ref={(el) => {
							c.el = el;
						}}
						specimen={c.specimen}
						onOpen={onOpen}
						// A link can be picked up and dragged; these are for chasing.
						draggable={false}
						// The copies are the same animal again: one stop in the
						// tab order and one entry for a screen reader is enough.
						aria-hidden={c.key !== c.specimen.id || undefined}
						tabIndex={c.key !== c.specimen.id ? -1 : undefined}
						data-lit={c.habit.mode === "fly" || undefined}
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
						{c.habit.mode === "fly" && (
							<span aria-hidden="true" className="vivarium-lantern" />
						)}
					</SpecimenLink>
				))}

				{crittersRef.current
					.filter((c) => c.habit.sheds)
					.map((c) => (
						<div
							key={c.key}
							ref={skinRef}
							aria-hidden="true"
							// Clickable only while it is there to be mistaken for
							// the animal; shed() and the fade switch that.
							onClick={() => setFooled(true)}
							className="vivarium-prop pointer-events-none absolute left-0 top-0 cursor-pointer text-theme-comment"
							style={{
								width: c.width,
								height: c.height,
								transformOrigin: "center bottom",
								opacity: 0,
							}}
						>
							<Plate artwork={c.art} className="h-full w-full" />
						</div>
					))}

				{crumbsRef.current.map((k) => (
					<span
						key={k.id}
						ref={(el) => {
							k.el = el;
							drawCrumb(k);
						}}
						aria-hidden="true"
						// The place is this element's and the paper is the one
						// inside: a tilt or a shrink on a moved element swings it
						// about the tank's corner instead of about itself.
						className="pointer-events-none absolute left-0 top-0"
						style={{ zIndex: 9998 }}
					>
						<span className="vivarium-crumb">{k.label}</span>
					</span>
				))}

				{notes !== "off" && <Annotations fading={notes === "fading"} />}

				{/* The label for whatever is under the cursor, pinned to the
				    tank's corner. A label that chased a walking animal would be
				    unreadable, and would cover the thing you are looking at. */}
				{hoveredSpecimen && (
					<div data-lit className="pointer-events-none absolute left-4 top-4 z-[20000]">
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

			{fooled && <Moult onClose={() => setFooled(false)} />}

			{/* Right padding keeps the button clear of the fixed tools in the
			    bottom-right corner, which sit over this row on first load. */}
			<div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 px-[max(4vmin,20px)] pr-24 pt-4">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
					<span className="font-hand text-theme-text-secondary">feed them:</span>
					{tray.slots.map((n, slot) => (
						<CrumbScrap
							// Keyed by slot, so the next crumb arrives under the
							// same focus and Enter can be pressed again.
							key={slot}
							label={FEEDERS[n].crumb ?? ""}
							full={crumbCount >= MAX_CRUMBS}
							onDrop={(at) => {
								if (!at) return dropCrumb(slot);
								const r = tankRef.current?.getBoundingClientRect();
								// Let go outside the tank: it goes back in the tray.
								if (!r || at.x < r.left || at.x > r.right || at.y < r.top || at.y > r.bottom) return;
								dropCrumb(slot, { x: at.x - r.left, y: at.y - r.top });
							}}
						/>
					))}
					{crumbCount >= MAX_CRUMBS && (
						<span className="font-hand text-sm text-theme-comment">
							that's plenty. let them eat.
						</span>
					)}
				</div>
				<div className="flex shrink-0 gap-2">
					<button
						type="button"
						onClick={() => setDark((v) => !v)}
						aria-pressed={dark}
						className={
							"rounded-sm border px-3 py-1.5 text-sm transition-colors " +
							(dark
								? "border-theme-accent text-theme-accent"
								: "border-theme-border text-theme-text hover:border-theme-accent/70 hover:text-theme-accent")
						}
					>
						Lights out
					</button>
					<button
						type="button"
						onClick={tapTheGlass}
						className="rounded-sm border border-theme-border px-3 py-1.5 text-sm text-theme-text transition-colors hover:border-theme-accent/70 hover:text-theme-accent"
					>
						Tap the glass
					</button>
				</div>
				{/* Full width, under the controls, so a long line never pushes
				    them about. Left empty, it still holds its height. */}
				<p aria-live="polite" className="min-h-5 w-full text-sm text-theme-comment">
					{said ||
						(reduced && "Reduced motion is on, so the collection is holding still.")}
					<noscript>
						The animals need JavaScript to walk about. The whole collection is
						in the journal below.
					</noscript>
				</p>
			</div>
		</div>
	);
}

/** What a click on Argia's shed skin gets. */
function Moult({ onClose }: { onClose: () => void }) {
	const ok = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		const returnTo = document.activeElement as HTMLElement | null;
		ok.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("keydown", onKey);
			returnTo?.focus?.();
		};
	}, [onClose]);
	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="moult-title"
			className="fixed inset-0 z-[70] flex items-center justify-center p-4"
		>
			<button
				type="button"
				tabIndex={-1}
				aria-label="Close"
				onClick={onClose}
				className="fixed inset-0 cursor-default bg-black/60"
			/>
			<div className="relative w-full max-w-sm -rotate-1 rounded-sm border-2 border-theme-border bg-theme-panel px-6 pb-5 pt-6 shadow-[3px_5px_0_rgb(0_0_0_/_0.3)]">
				<p id="moult-title" className="font-hand text-lg leading-snug text-theme-text-primary">
					nope, that is just a shedded layer, catch the real one instead
				</p>
				<button
					ref={ok}
					type="button"
					onClick={onClose}
					className="mt-4 rounded-sm border border-theme-border px-3 py-1.5 text-sm text-theme-text transition-colors hover:border-theme-accent/70 hover:text-theme-accent"
				>
					fine
				</button>
			</div>
		</div>
	);
}

/** A crumb in the tray. Click it, or press Enter on it, and it falls
 *  somewhere in the tank. Drag it and it falls where it is let go. */
function CrumbScrap({
	label,
	full,
	onDrop,
}: {
	label: string;
	/** The tank has all the food it will take for now. */
	full: boolean;
	/** `at` is in viewport pixels, and only set for a drag. */
	onDrop: (at?: { x: number; y: number }) => void;
}) {
	const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
	// A drag ends with a click on the same button, which must not drop a
	// second crumb.
	const dragged = useRef(false);
	const letGo = (e: React.PointerEvent<HTMLButtonElement>) => {
		e.currentTarget.style.translate = "";
		const d = drag.current;
		drag.current = null;
		return !!d?.moved;
	};
	return (
		<button
			type="button"
			aria-label={`Drop "${label}" into the tank`}
			// aria-disabled rather than disabled: a disabled button drops
			// keyboard focus, and Enter should work again once there is room.
			aria-disabled={full || undefined}
			className="vivarium-crumb cursor-grab touch-none select-none active:cursor-grabbing aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
			onPointerDown={(e) => {
				if (e.button !== 0 || full) return;
				drag.current = { x: e.clientX, y: e.clientY, moved: false };
				e.currentTarget.setPointerCapture(e.pointerId);
			}}
			onPointerMove={(e) => {
				const d = drag.current;
				if (!d) return;
				const dx = e.clientX - d.x;
				const dy = e.clientY - d.y;
				if (!d.moved && Math.hypot(dx, dy) < DRAG_START_PX) return;
				d.moved = true;
				e.currentTarget.style.translate = `${dx}px ${dy}px`;
			}}
			onPointerUp={(e) => {
				if (!letGo(e)) return;
				dragged.current = true;
				onDrop({ x: e.clientX, y: e.clientY });
			}}
			onPointerCancel={letGo}
			onClick={() => {
				if (dragged.current) {
					dragged.current = false;
					return;
				}
				if (full) return;
				onDrop();
			}}
		>
			{label}
		</button>
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
