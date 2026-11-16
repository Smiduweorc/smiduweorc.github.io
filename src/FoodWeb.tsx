// Every edge must be stated in a README. A relation nobody wrote down is not
// drawn, because a diagram reads as a claim.
// Nodes are HTML buttons over an SVG of the edges, on one shared grid, so the
// labels stay real text at real sizes.

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { bagwormQuip } from "./bagworm/Bagworm";
import { useMediaQuery, usePrefersReducedMotion } from "./media";
import { Plate } from "./vivarium/artwork";
import { SpecimenLink } from "./SpecimenLink";
import { SPECIMENS, byId, type Specimen } from "./specimens";

const W = 1200;
const H = 680;

const NODES: Record<string, { x: number; y: number }> = {
	"aphid-template": { x: 150, y: 110 },
	"dung-beetle-template": { x: 150, y: 330 },
	"rove-beetle": { x: 150, y: 600 },
	darter: { x: 430, y: 330 },
	firefly: { x: 700, y: 110 },
	repletes: { x: 1030, y: 110 },
	mycocepurus: { x: 700, y: 360 },
	lacewing: { x: 1030, y: 340 },
	antlion: { x: 1030, y: 610 },
};

// The cocoon casts' box, below the web; no edge runs to it.
const BOX = { x: 600, y: 605, w: 420, h: 120 };
const COCOONS = SPECIMENS.filter((s) => s.art === "cocoon");

type Edge = {
	from: string;
	to: string;
	/** "descends" is lineage, "hands" is a job passed to a sibling. */
	kind: "descends" | "hands";
	label: string;
};

const EDGES: Edge[] = [
	{ from: "aphid-template", to: "dung-beetle-template", kind: "descends", label: "Aphid, plus a generator" },
	{ from: "dung-beetle-template", to: "rove-beetle", kind: "descends", label: "similar, for UTCP" },
	{ from: "aphid-template", to: "darter", kind: "descends", label: "Aphid, in Dart" },
	{ from: "lacewing", to: "antlion", kind: "descends", label: "wraps a Lacewing profile" },
	{ from: "repletes", to: "firefly", kind: "hands", label: "retries" },
	{ from: "firefly", to: "repletes", kind: "hands", label: "caching" },
	{ from: "mycocepurus", to: "firefly", kind: "hands", label: "retries, single-flight" },
	{ from: "aphid-template", to: "firefly", kind: "hands", label: "its transport" },
];

// Edges stop this far short of a node's centre, so arrowheads clear the drawing.
const NODE_CLEAR = 72;
const BOW = 26;
// Edges both ways between one pair bow further, so one arrowhead does not land
// on the other's tail.
const LOOP_BOW = 40;
const LOOP_SPLIT = 16;
// The name sits under the drawing, so an edge leaving downwards or arriving
// from below has to clear the caption as well.
const CAPTION_CLEAR = 34;
const hasReverse = (e: Edge) =>
	EDGES.some((o) => o.from === e.to && o.to === e.from);

function geometry(e: Edge) {
	const a = NODES[e.from];
	const b = NODES[e.to];
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const len = Math.hypot(dx, dy);
	const ux = dx / len;
	const uy = dy / len;
	const split = hasReverse(e) ? LOOP_SPLIT : 0;
	const leave = NODE_CLEAR + CAPTION_CLEAR * Math.max(0, uy);
	const arrive = NODE_CLEAR + CAPTION_CLEAR * Math.max(0, -uy);
	const sx = a.x + ux * leave - uy * split;
	const sy = a.y + uy * leave + ux * split;
	const ex = b.x - ux * arrive - uy * split;
	const ey = b.y - uy * arrive + ux * split;
	const bow = hasReverse(e) ? LOOP_BOW : BOW;
	const cx = (sx + ex) / 2 - uy * bow * 2;
	const cy = (sy + ey) / 2 + ux * bow * 2;
	const mx = ((sx + ex) / 2 + cx) / 2;
	const my = ((sy + ey) / 2 + cy) / 2;
	return { d: `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`, mx, my };
}

// The jigsaw: the web is cut into COLS x ROWS pieces. Each piece is a whole
// copy of the board, clipped to its own cell with knobs, so a piece carries
// exactly the part of the drawing it covers. The prerendered page and any
// visitor who already rebuilt it get the whole, working board.
const COLS = 3;
const ROWS = 2;
const PIECES = COLS * ROWS;
// How close to home, in board units, a dropped piece has to land to click in.
const SNAP = 60;
const KNOB = { x: 0.03, y: 0.05 };
const SOLVED_KEY = "smiduweorc-web-mended";
const GUST_MS = 650;

// Which way each inner edge's knob points: +1 right or down, -1 the other way.
const V_KNOB = [1, -1, -1, 1];
const H_KNOB = [1, -1, 1];

function edgePath(x0: number, y0: number, x1: number, y1: number, ox: number, oy: number) {
	const dx = x1 - x0;
	const dy = y1 - y0;
	const ax = x0 + dx * 0.38;
	const ay = y0 + dy * 0.38;
	const bx = x0 + dx * 0.62;
	const by = y0 + dy * 0.62;
	return (
		`L${ax} ${ay} ` +
		`C${ax + ox - dx * 0.08} ${ay + oy - dy * 0.08} ${bx + ox + dx * 0.08} ${by + oy + dy * 0.08} ${bx} ${by} ` +
		`L${x1} ${y1} `
	);
}

/** The piece's outline in objectBoundingBox units, so it scales with the board. */
function piecePath(i: number) {
	const c = i % COLS;
	const r = Math.floor(i / COLS);
	const l = c / COLS;
	const rt = (c + 1) / COLS;
	const t = r / ROWS;
	const b = (r + 1) / ROWS;
	// The same knob from both sides of an edge: one piece's tab is the other's hole.
	const top = r > 0 ? H_KNOB[c] * KNOB.y : 0;
	const bottom = r < ROWS - 1 ? H_KNOB[c] * KNOB.y : 0;
	const left = c > 0 ? V_KNOB[r * (COLS - 1) + c - 1] * KNOB.x : 0;
	const right = c < COLS - 1 ? V_KNOB[r * (COLS - 1) + c] * KNOB.x : 0;
	return (
		`M${l} ${t} ` +
		edgePath(l, t, rt, t, 0, top) +
		edgePath(rt, t, rt, b, right, 0) +
		edgePath(rt, b, l, b, 0, bottom) +
		edgePath(l, b, l, t, left, 0) +
		"Z"
	);
}

type Spot = { x: number; y: number; turn: number };
const HOME: Spot = { x: 0, y: 0, turn: 0 };
const cellCentre = (i: number) => ({
	x: ((i % COLS) + 0.5) * (W / COLS),
	y: (Math.floor(i / COLS) + 0.5) * (H / ROWS),
});

const inward = (at: number, of: number) =>
	at === 0 ? 1 : at === of - 1 ? -1 : Math.random() < 0.5 ? 1 : -1;

/** Every piece to some other piece's cell, a little askew. */
function scatter(): Spot[] {
	const order = [...Array(PIECES).keys()];
	do {
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[order[i], order[j]] = [order[j], order[i]];
		}
	} while (order.some((o, i) => o === i));
	return order.map((to, i) => {
		const a = cellCentre(i);
		const b = cellCentre(to);
		return {
			// Nudged only inwards at the board's edges, so no piece hangs
			// outside the frame where it would be cut off.
			x: b.x - a.x + inward(to % COLS, COLS) * Math.random() * 30,
			y: b.y - a.y + inward(Math.floor(to / COLS), ROWS) * Math.random() * 24,
			turn: (Math.random() - 0.5) * 8,
		};
	});
}

function readMended() {
	try {
		return localStorage.getItem(SOLVED_KEY) === "1";
	} catch {
		return false;
	}
}

function writeMended() {
	try {
		localStorage.setItem(SOLVED_KEY, "1");
	} catch {
		// Not remembered; the gust may come again next visit.
	}
}

function Board({ onOpen, idSuffix = "" }: { onOpen: (s: Specimen) => void; idSuffix?: string }) {
	// The animal under the pointer or the focus: its own edges stay and the
	// rest fade, so one animal's relations can be read out of the tangle.
	const [on, setOn] = useState<string | null>(null);
	const faded = (e: Edge) => on !== null && e.from !== on && e.to !== on;
	return (
		<>
			<svg
				viewBox={`0 0 ${W} ${H}`}
				className="absolute inset-0 h-full w-full text-theme-comment"
				aria-hidden="true"
			>
				<defs>
					<marker
						id={`fw-arrow${idSuffix}`}
						viewBox="0 0 10 10"
						refX="8"
						refY="5"
						markerWidth="7"
						markerHeight="7"
						orient="auto-start-reverse"
					>
						<path d="M1 1 L9 5 L1 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
					</marker>
				</defs>
				{EDGES.map((e) => (
					<path
						key={e.from + e.to}
						d={geometry(e).d}
						fill="none"
						stroke="currentColor"
						strokeWidth={e.kind === "descends" ? 2 : 1.5}
						strokeDasharray={e.kind === "hands" ? "6 7" : undefined}
						strokeLinecap="round"
						markerEnd={`url(#fw-arrow${idSuffix})`}
						className="transition-opacity"
						opacity={faded(e) ? 0.15 : 1}
					/>
				))}

			</svg>

			{EDGES.map((e) => {
				const { mx, my } = geometry(e);
				return (
					<span
						key={`label-${e.from}-${e.to}`}
						className={
							"absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-theme-panel px-1.5 text-sm transition-opacity " +
						(faded(e) ? "opacity-15 " : "") +
						(e.kind === "descends"
							? "text-theme-text-secondary"
							: "italic text-theme-comment")
						}
						style={{ left: `${(mx / W) * 100}%`, top: `${(my / H) * 100}%` }}
					>
						{e.label}
					</span>
				);
			})}

			{/* Pinned by centre: at phone width the names wrap, so the box grows both ways. */}
			<div
				className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-theme-border bg-theme-panel px-3 py-2 md:gap-2 md:px-4"
				style={{
					left: `${(BOX.x / W) * 100}%`,
					top: `${(BOX.y / H) * 100}%`,
					width: `${(BOX.w / W) * 100}%`,
					minHeight: `${(BOX.h / H) * 100}%`,
				}}
			>
				<span className="font-display text-xl text-theme-text-primary">templates</span>
				<span className="flex flex-wrap justify-center gap-x-3 gap-y-1">
					{COCOONS.map((s) => (
						<SpecimenLink
							key={s.id}
							specimen={s}
							onOpen={onOpen}
							data-note={s.note}
							className="font-mono text-xs text-theme-text-secondary underline decoration-theme-border underline-offset-4 transition-colors hover:text-theme-text-primary hover:decoration-theme-accent"
						>
							{s.name}
						</SpecimenLink>
					))}
				</span>
			</div>

			{Object.entries(NODES).map(([id, p]) => {
				const s = byId(id);
				if (!s) return null;
				return (
					<SpecimenLink
						key={id}
						specimen={s}
						onOpen={onOpen}
						data-note={s.note}
						onMouseEnter={() => setOn(id)}
						onMouseLeave={() => setOn(null)}
						onFocus={() => setOn(id)}
						onBlur={() => setOn(null)}
						className="group absolute flex w-max -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-sm p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
						style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
					>
						<span className="flex h-16 w-full items-center justify-center text-theme-text-secondary transition-colors group-hover:text-theme-accent">
							<Plate artwork={s.art} className="h-full w-28" />
						</span>
						<span className="font-display text-lg leading-tight text-theme-text-primary">
							{s.name}
						</span>
					</SpecimenLink>
				);
			})}
		</>
	);
}

export function FoodWeb({ onOpen }: { onOpen: (s: Specimen) => void }) {
	const reduced = usePrefersReducedMotion();
	// The board is 46rem wide. Narrower than that it scrolls in its frame,
	// and loose pieces covering the frame would leave nothing to scroll by,
	// so phones get the whole web and no puzzle.
	const fits = useMediaQuery("(min-width: 48rem)");
	const playable = fits && !reduced;
	const frame = useRef<HTMLDivElement>(null);
	// null is the whole board. Otherwise each piece's offset from home.
	const [spots, setSpots] = useState<Spot[] | null>(null);
	const [gusting, setGusting] = useState(false);
	const [held, setHeld] = useState<number | null>(null);
	const [said, setSaid] = useState("");
	const grab = useRef<{ i: number; x: number; y: number; from: Spot } | null>(null);

	// The cutscene: the first time the web comes into view, a gust shakes it
	// and knocks the pieces apart. Once, ever, unless the visitor asks again.
	useEffect(() => {
		// The scrolling frame, not the board: on a phone the board is wider
		// than the screen and never shows more than half of itself.
		const el = frame.current?.parentElement;
		if (!el || !playable || readMended()) return;
		let timer = 0;
		const watch = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				watch.disconnect();
				timer = window.setTimeout(() => knockApart(), 500);
			},
			{ threshold: 0.6 },
		);
		watch.observe(el);
		return () => {
			watch.disconnect();
			window.clearTimeout(timer);
		};
	}, [playable]);

	function knockApart() {
		setGusting(true);
		setSaid("");
		window.setTimeout(() => {
			setGusting(false);
			setSpots(scatter());
			setSaid("a gust knocked the web apart. drag the pieces back where they go.");
		}, GUST_MS);
	}

	function mend(line: string) {
		writeMended();
		setSpots(null);
		setSaid(line);
	}

	const onDown = (i: number) => (ev: PointerEvent<HTMLDivElement>) => {
		if (!spots || ev.button !== 0) return;
		ev.currentTarget.setPointerCapture(ev.pointerId);
		grab.current = { i, x: ev.clientX, y: ev.clientY, from: spots[i] };
		setHeld(i);
	};
	const onMove = (ev: PointerEvent<HTMLDivElement>) => {
		const g = grab.current;
		if (!g || !spots || !frame.current) return;
		const r = frame.current.getBoundingClientRect();
		const next = [...spots];
		next[g.i] = {
			x: g.from.x + ((ev.clientX - g.x) / r.width) * W,
			y: g.from.y + ((ev.clientY - g.y) / r.height) * H,
			turn: g.from.turn,
		};
		setSpots(next);
	};
	const onUp = () => {
		const g = grab.current;
		grab.current = null;
		setHeld(null);
		if (!g || !spots) return;
		const s = spots[g.i];
		if (Math.hypot(s.x, s.y) > SNAP) return;
		const next = [...spots];
		next[g.i] = HOME;
		if (next.every((p) => p === HOME)) {
			mend("the web holds again.");
			bagwormQuip(frame.current, "all back together. every strand in its place.");
		} else {
			setSpots(next);
		}
	};

	const loose = spots !== null || gusting;
	return (
		<>
			{/* The same facts as sentences, for screen readers. */}
			<ul className="sr-only">
				{EDGES.map((e) => (
					<li key={e.from + e.to} className="text-theme-text-secondary">
						<span className="text-theme-text-primary">{byId(e.from)?.name}</span>
						{e.kind === "descends" ? " to " : " hands "}
						{e.kind === "hands" && <span>{e.label} to </span>}
						<span className="text-theme-text-primary">{byId(e.to)?.name}</span>
						{e.kind === "descends" && (
							<span className="text-theme-comment">: {e.label}</span>
						)}
					</li>
				))}
			</ul>

			{/* Phones scroll the web inside its own frame, never the page. */}
			<p className="font-hand mb-2 text-sm text-theme-comment md:hidden">
				swipe sideways to see the whole web
			</p>
			<div className="-mx-2 overflow-x-auto px-2 pb-8 pt-3">
				<div
					ref={frame}
					className={"relative mx-auto w-full min-w-[46rem] max-w-[90rem]" + (gusting ? " web-gust" : "")}
					style={{ aspectRatio: `${W} / ${H}` }}
				>
					{!loose && <Board onOpen={onOpen} />}
					{loose && (
						<>
							{/* Where the pieces go: faint outlines of the cells. */}
							<svg
								viewBox="0 0 1 1"
								preserveAspectRatio="none"
								className="absolute inset-0 h-full w-full text-theme-border"
								aria-hidden="true"
							>
								{[...Array(PIECES).keys()].map((i) => (
									<path key={i} d={piecePath(i)} fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
								))}
								<defs>
									{[...Array(PIECES).keys()].map((i) => (
										<clipPath key={i} id={`fw-piece-${i}`} clipPathUnits="objectBoundingBox">
											<path d={piecePath(i)} />
										</clipPath>
									))}
								</defs>
							</svg>
							{[...Array(PIECES).keys()].map((i) => {
								const s = spots?.[i] ?? HOME;
								const c = cellCentre(i);
								const home = s === HOME && spots !== null;
								return (
									<div
										key={i}
										aria-hidden="true"
										data-drag
										onPointerDown={onDown(i)}
										onPointerMove={onMove}
										onPointerUp={onUp}
										onPointerCancel={onUp}
										className={
											"web-piece absolute inset-0 touch-none select-none bg-theme-panel " +
											(home ? "pointer-events-none " : "cursor-grab ") +
											(held === i ? "z-20 cursor-grabbing " : home ? "z-0 " : "z-10 ") +
											(held === i ? "" : "transition-transform duration-700 ease-out")
										}
										style={{
											clipPath: `url(#fw-piece-${i})`,
											transformOrigin: `${(c.x / W) * 100}% ${(c.y / H) * 100}%`,
											transform: `translate(${(s.x / W) * 100}%, ${(s.y / H) * 100}%) rotate(${held === i ? 0 : s.turn}deg)`,
										}}
									>
										<div inert className="absolute inset-0">
											<Board onOpen={onOpen} idSuffix={`-${i}`} />
										</div>
										{/* The cut, so a loose piece reads as a piece. */}
										{!home && (
											<svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-theme-text-secondary" aria-hidden="true">
												<path d={piecePath(i)} fill="none" stroke="currentColor" strokeWidth={3} vectorEffect="non-scaling-stroke" />
											</svg>
										)}
									</div>
								);
							})}
						</>
					)}
				</div>
			</div>

			<div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
				<p aria-live="polite" className="font-hand text-theme-comment">
					{said}
				</p>
				{spots && (
					<button
						type="button"
						onClick={() => mend("put back for you.")}
						className="text-sm text-theme-text-secondary underline decoration-theme-border underline-offset-4 hover:text-theme-text-primary"
					>
						put it back for me
					</button>
				)}
				{!loose && playable && (
					<button
						type="button"
						onClick={knockApart}
						className="text-sm text-theme-comment underline decoration-theme-border underline-offset-4 hover:text-theme-text-primary"
					>
						knock it apart
					</button>
				)}
			</div>
		</>
	);
}
