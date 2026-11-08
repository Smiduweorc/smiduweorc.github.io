// Every edge must be stated in a README. A relation nobody wrote down is not
// drawn, because a diagram reads as a claim.
// Nodes are HTML buttons over an SVG of the edges, on one shared grid, so the
// labels stay real text at real sizes.

import { Plate } from "./vivarium/artwork";
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

export function FoodWeb({ onOpen }: { onOpen: (s: Specimen) => void }) {
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
			<div className="-mx-2 overflow-x-auto px-2 pb-3">
				<div
					className="relative mx-auto w-full min-w-[46rem] max-w-[90rem]"
					style={{ aspectRatio: `${W} / ${H}` }}
				>
					<svg
						viewBox={`0 0 ${W} ${H}`}
						className="absolute inset-0 h-full w-full text-theme-comment"
						aria-hidden="true"
					>
						<defs>
							<marker
								id="fw-arrow"
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
								markerEnd="url(#fw-arrow)"
							/>
						))}
					</svg>

					{EDGES.map((e) => {
						const { mx, my } = geometry(e);
						return (
							<span
								key={`label-${e.from}-${e.to}`}
								className={
									"absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-theme-panel px-1.5 text-sm " +
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
								<button
									key={s.id}
									type="button"
									onClick={() => onOpen(s)}
									data-note={s.note}
									className="font-mono text-xs text-theme-text-secondary underline decoration-theme-border underline-offset-4 transition-colors hover:text-theme-text-primary hover:decoration-theme-accent"
								>
									{s.name}
								</button>
							))}
						</span>
					</div>

					{Object.entries(NODES).map(([id, p]) => {
						const s = byId(id);
						if (!s) return null;
						return (
							<button
								key={id}
								type="button"
								onClick={() => onOpen(s)}
								data-note={s.note}
								className="group absolute flex w-max -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-sm p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
								style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
							>
								<span className="flex h-16 w-full items-center justify-center text-theme-text-secondary transition-colors group-hover:text-theme-accent">
									<Plate artwork={s.art} className="h-full w-28" />
								</span>
								<span className="font-display text-lg leading-tight text-theme-text-primary">
									{s.name}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
}
