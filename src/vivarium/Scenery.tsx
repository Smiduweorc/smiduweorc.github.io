// The furniture of the tank: a dead branch, ferns, grass, a vine and the
// dung beetle's cave.
//
// Every drawing in this file is a placeholder. The insects are grml's own
// Excalidraw drawings, and the house rule is that the site carries no art
// grml did not draw, so these are kept to one plain stroke in currentColor,
// the same weight as the logos, and sit at the back of the tank in the
// border colour. Swap any of them for a real drawing by replacing the one
// component; nothing outside this file knows what the paths look like.
//
// The paths are wobbled by hand rather than drawn with clean arcs, because a
// perfect curve next to a hand-drawn insect reads as clip art.

const stroke = {
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round",
	// One screen weight whatever size the drawing is stretched to, so a tall
	// branch and a small tuft are drawn with the same pen.
	vectorEffect: "non-scaling-stroke",
} as const;

/** A bare branch planted at the left wall, tall enough to reach the lid. */
function Branch({ className = "" }: { className?: string }) {
	return (
		<svg viewBox="0 0 220 400" className={className} aria-hidden="true">
			<g {...stroke}>
				{/* trunk, two lines that never quite stay parallel */}
				<path d="M58 400 C 60 340, 52 300, 62 250 C 70 210, 66 160, 78 112 C 86 80, 92 52, 104 18" />
				<path d="M84 400 C 82 352, 76 310, 84 262 C 90 222, 88 176, 98 128 C 104 98, 108 66, 116 30" />
				{/* bark marks */}
				<path d="M66 360 C 70 352, 72 346, 70 338" opacity="0.6" />
				<path d="M74 300 C 77 292, 78 286, 76 280" opacity="0.6" />
				<path d="M80 206 C 84 198, 85 192, 83 186" opacity="0.6" />
				{/* limbs */}
				<path d="M88 236 C 114 222, 140 210, 176 204 C 188 202, 198 196, 206 188" />
				<path d="M92 226 C 116 216, 138 202, 170 196" />
				<path d="M150 206 C 156 190, 158 176, 170 162" />
				<path d="M96 150 C 74 132, 52 124, 22 122" />
				<path d="M94 140 C 72 126, 50 116, 26 114" />
				<path d="M48 120 C 40 104, 38 92, 30 80" />
				<path d="M106 94 C 126 82, 146 78, 168 80" />
				<path d="M138 80 C 146 70, 150 60, 160 52" />
				{/* a few leaves that refused to drop */}
				<path d="M176 204 C 186 214, 198 214, 206 206 C 198 198, 186 196, 176 204 Z" />
				<path d="M168 162 C 172 150, 182 146, 190 148 C 188 158, 178 164, 168 162 Z" />
				<path d="M30 80 C 22 70, 24 60, 30 54 C 36 62, 36 72, 30 80 Z" />
				<path d="M160 52 C 168 42, 178 42, 184 46 C 178 54, 168 56, 160 52 Z" />
			</g>
		</svg>
	);
}

/** A fern: a curved rachis with leaflets either side, one frond still curled. */
function Fern({ className = "" }: { className?: string }) {
	return (
		<svg viewBox="0 0 160 170" className={className} aria-hidden="true">
			<g {...stroke}>
				<path d="M78 170 C 76 130, 60 92, 26 62" />
				<path d="M70 120 C 58 116, 48 106, 44 96" />
				<path d="M62 100 C 50 96, 40 88, 36 78" />
				<path d="M74 140 C 64 138, 52 132, 46 122" />
				<path d="M58 106 C 62 94, 62 84, 58 74" />
				<path d="M66 128 C 74 118, 76 108, 74 96" />
				<path d="M44 80 C 48 70, 48 62, 44 54" />
				<path d="M82 170 C 86 124, 102 90, 138 64" />
				<path d="M90 120 C 102 116, 112 108, 118 98" />
				<path d="M98 100 C 110 98, 120 90, 126 80" />
				<path d="M86 140 C 98 138, 108 132, 114 122" />
				<path d="M100 104 C 98 92, 100 82, 106 74" />
				{/* the fiddlehead */}
				<path d="M80 170 C 80 140, 82 112, 86 92 C 90 74, 104 70, 106 82 C 108 92, 96 94, 96 86" />
			</g>
		</svg>
	);
}

/** A tuft of grass blades of uneven height. */
function Tuft({ className = "" }: { className?: string }) {
	return (
		<svg viewBox="0 0 80 70" className={className} aria-hidden="true">
			<g {...stroke}>
				<path d="M20 70 C 18 52, 12 38, 4 26" />
				<path d="M30 70 C 30 48, 34 28, 30 6" />
				<path d="M38 70 C 42 54, 50 42, 60 34" />
				<path d="M46 70 C 50 56, 62 50, 76 48" />
				<path d="M26 70 C 22 60, 18 54, 12 50" />
			</g>
		</svg>
	);
}

/** A vine hanging from the lid, with a leaf every so often. */
function Vine({ className = "" }: { className?: string }) {
	return (
		<svg viewBox="0 0 60 220" className={className} aria-hidden="true">
			<g {...stroke}>
				<path d="M30 0 C 22 30, 40 56, 30 86 C 22 110, 38 136, 30 164 C 26 182, 32 200, 28 214" />
				<path d="M30 40 C 40 34, 50 36, 54 42 C 46 48, 36 48, 30 40 Z" />
				<path d="M30 92 C 20 86, 10 88, 6 94 C 14 100, 24 100, 30 92 Z" />
				<path d="M32 140 C 42 134, 52 136, 56 142 C 48 148, 38 148, 32 140 Z" />
				<path d="M29 190 C 20 186, 12 188, 8 194 C 16 198, 24 198, 29 190 Z" />
			</g>
		</svg>
	);
}

/** Everything that stands still at the back of the tank. */
export function Scenery() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 text-theme-border"
		>
			<Branch className="absolute bottom-0 left-[1%] h-[96%] w-auto" />
			<Vine className="absolute left-[38%] top-0 h-[46%] w-auto" />
			<Vine className="absolute left-[71%] top-0 h-[30%] w-auto -scale-x-100" />
			<Fern className="absolute bottom-0 left-[24%] h-[34%] w-auto" />
			<Fern className="absolute bottom-0 left-[56%] h-[26%] w-auto -scale-x-100" />
			<Tuft className="absolute bottom-0 left-[16%] h-[12%] w-auto" />
			<Tuft className="absolute bottom-0 left-[47%] h-[10%] w-auto -scale-x-100" />
			<Tuft className="absolute bottom-0 left-[66%] h-[13%] w-auto" />
			<Substrate />
		</div>
	);
}

/** Moss and litter along the tank floor. */
function Substrate() {
	return (
		// Its top edge sits at the back of the vivarium's floor band
		// (FLOOR_BAND, 30% of the tank), plus a little for the moss to rise.
		<svg
			viewBox="0 0 400 120"
			preserveAspectRatio="none"
			className="absolute inset-x-0 bottom-0 h-[34%] w-full"
		>
			<path
				d="M0 14 C 40 4, 78 12, 116 8 C 154 4, 190 14, 230 10 C 268 6, 310 12, 348 6 C 372 2, 388 8, 400 6 L400 120 L0 120 Z"
				className="fill-current opacity-30"
			/>
			<path
				d="M0 64 C 52 56, 96 64, 148 60 C 200 56, 246 66, 300 62 C 344 58, 372 64, 400 60 L400 120 L0 120 Z"
				className="fill-current opacity-55"
			/>
		</svg>
	);
}

/** The cave's back wall: the dark inside, drawn under the boll. Sized and
 *  placed by the vivarium, which owns the mouth's coordinates. */
export function CaveInside({ parked }: { parked: number }) {
	// Parked bolls stack against the back wall, at most three, because a cave
	// with forty balls in it is a warehouse.
	const shown = Math.min(parked, 3);
	return (
		<svg viewBox="0 0 200 130" className="h-full w-full" aria-hidden="true">
			<path
				d="M36 130 C 40 96, 58 64, 92 56 C 124 50, 152 70, 164 104 C 168 114, 170 122, 170 130 Z"
				className="fill-theme-bg"
			/>
			<g {...stroke} className="text-theme-border">
				{Array.from({ length: shown }, (_, i) => (
					<circle key={i} cx={128 - i * 22} cy={118 - (i % 2) * 6} r={11} />
				))}
			</g>
		</svg>
	);
}

/** The cave's rock face, drawn over the boll so it rolls in behind it. */
export function CaveRock() {
	return (
		<svg viewBox="0 0 200 130" className="h-full w-full" aria-hidden="true">
			<g {...stroke}>
				<path d="M0 130 C 4 100, 14 72, 34 52 C 54 30, 84 16, 118 18 C 152 20, 182 40, 196 74 C 200 90, 200 112, 200 130" />
				<path d="M36 130 C 40 96, 58 64, 92 56 C 124 50, 152 70, 164 104 C 168 114, 170 122, 170 130" />
				<path d="M60 40 C 72 34, 86 32, 98 34" opacity="0.6" />
				<path d="M150 36 C 162 44, 172 54, 178 66" opacity="0.6" />
				<path d="M178 96 C 184 104, 186 112, 186 122" opacity="0.6" />
			</g>
		</svg>
	);
}

/** The ball of dung the beetle rolls: lumpy, filled, with bits of straw
 *  stuck in it so the roll can be seen turning. */
export function Boll() {
	return (
		<svg viewBox="-50 -50 100 100" className="h-full w-full" aria-hidden="true">
			<path
				d="M2 -47 C 14 -48, 22 -42, 30 -38 C 40 -32, 47 -22, 46 -10 C 49 2, 46 14, 41 24 C 35 36, 24 44, 10 46 C -2 49, -14 46, -24 41 C -36 35, -44 24, -46 10 C -49 -2, -46 -16, -40 -26 C -33 -38, -20 -45, -8 -46 C -4 -48, -1 -47, 2 -47 Z"
				className="fill-current"
				fillOpacity={0.32}
				{...stroke}
				// Unlike the scenery, the ball's edge grows with it: a pellet
				// drawn with a 2px pen is a rounded square, not a crumb of dung.
				vectorEffect="none"
				strokeWidth={4}
			/>
			<g {...stroke} vectorEffect="none" strokeWidth={4} opacity={0.85}>
				<path d="M-24 -18 L -10 -24" />
				<path d="M12 -30 L 22 -18" />
				<path d="M-30 12 L -18 20" />
				<path d="M6 8 L 20 4" />
				<path d="M-4 28 L 10 34" />
			</g>
			<g className="fill-current">
				<circle cx="-6" cy="-6" r="3" />
				<circle cx="28" cy="18" r="2.5" />
				<circle cx="-22" cy="-34" r="2" />
				<circle cx="-34" cy="-2" r="2.5" />
			</g>
		</svg>
	);
}
