import { useEffect, useRef, useState } from "react";
import { Plate } from "./vivarium/artwork";
import { NpmCount } from "./NpmCount";
import { SpecimenLink } from "./SpecimenLink";
import {
	KIND_META,
	KIND_ORDER,
	SPECIMENS,
	type Kind,
	type Reading,
	type Specimen,
} from "./specimens";

type Page = Kind | "popular";

const PAGE_NOTE: Record<Page, string> = {
	popular: "the ones people ask about. not a ranking.",
	library: "you import these. they run inside your process.",
	instrument: "you run these at your code. they don't ship with it.",
	cast: "start here, then delete the bits you don't want.",
	colony: "you run this one. other people are the ones using it.",
};

// Fixed per slot, not random, so every visit looks the same.
const PHOTO_TILT = [-1.6, 1.1, -0.6, 1.4, -1.2, 0.7];

// [side, width in rem, angle in degrees]
type Strip = ["left" | "right", number, number];
const TAPE: Strip[][] = [
	[["left", 4, -24], ["right", 3.5, 18]],
	[["right", 4.5, 12]],
	[["left", 3, -32], ["right", 4, 26]],
	[["left", 5, -8]],
	[["left", 4, -18], ["right", 3, 34]],
	[["right", 3.5, 22]],
];

// Which way each side-on drawing faces. Top-down drawings and unclear heads
// are not listed, so they are not turned.
const FACES: Partial<Record<string, "left" | "right">> = {
	lacewing: "right",
	cephalote: "left",
	bagworm: "right",
	bollworm: "right",
	argia: "right",
	"rove-beetle": "right",
	"dung-beetle-template": "left",
	firefly: "left",
	"leafcutter-ant": "left",
	mycocepurus: "left",
	repletes: "left",
};

// Species whose real counterparts are iridescent: green lacewing wings,
// scarab shells, damselfly and dragonfly bodies. Their prints catch a foil
// sheen that moves with the pointer or the phone's tilt, so the rare ones in
// the set can be told apart by looking, and by the word on the print.
const IRIDESCENT = new Set(["lacewing", "dung-beetle-template", "argia", "darter"]);

const onPage = (page: Page) =>
	SPECIMENS.filter((s) => (page === "popular" ? s.highlight : s.kind === page));

export function Cabinet({
	reading,
	onOpen,
	onSpotlight,
}: {
	reading: Reading;
	onOpen: (s: Specimen) => void;
	/** The animal the pointer is resting on, or null. */
	onSpotlight: (id: string | null) => void;
}) {
	const [page, setPage] = useState<Page>("popular");
	const wallRef = useRef<HTMLUListElement>(null);

	// One listener, and at most one layout read per frame.
	useEffect(() => {
		let raf = 0;
		let x = 0;
		const face = () => {
			raf = 0;
			const wall = wallRef.current;
			if (!wall) return;
			for (const el of wall.querySelectorAll<HTMLElement>("[data-face]")) {
				const r = el.getBoundingClientRect();
				const wantsLeft = x < r.left + r.width / 2;
				const facesLeft = el.dataset.face === "left";
				el.style.scale = wantsLeft === facesLeft ? "1 1" : "-1 1";
			}
		};
		const onMove = (e: PointerEvent) => {
			if (e.pointerType === "touch") return;
			x = e.clientX;
			if (!raf) raf = requestAnimationFrame(face);
		};
		// On a phone the foil follows the tilt of the phone instead. Browsers
		// that ask permission for motion (iOS) simply never send this.
		const onTilt = (e: DeviceOrientationEvent) => {
			const wall = wallRef.current;
			if (!wall || e.gamma === null || e.beta === null) return;
			const clamp = (v: number) => Math.max(0, Math.min(1, v));
			wall.style.setProperty("--holo-x", String(clamp(0.5 + e.gamma / 60)));
			wall.style.setProperty("--holo-y", String(clamp(0.5 + (e.beta - 45) / 60)));
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("deviceorientation", onTilt);
		return () => {
			window.removeEventListener("deviceorientation", onTilt);
			window.removeEventListener("pointermove", onMove);
			cancelAnimationFrame(raf);
		};
	}, []);

	if (reading === "spec") return <SpecSheet items={SPECIMENS} onOpen={onOpen} />;

	const pages: Page[] = ["popular", ...KIND_ORDER];
	return (
		<div>
			{/* The cabinet's face: one wooden drawer per part of the collection.
			    The open one stands pulled out of the row. */}
			<div
				role="tablist"
				aria-label="Which drawer of the collection"
				className="cabinet-face mb-6 grid grid-cols-3 gap-2 rounded-sm border-2 border-theme-border bg-theme-panel p-2 sm:grid-cols-5"
			>
				{pages.map((p) => {
					const active = p === page;
					return (
						<button
							key={p}
							type="button"
							role="tab"
							aria-selected={active}
							aria-controls="cabinet-page"
							data-note={PAGE_NOTE[p]}
							onClick={() => setPage(p)}
							data-open={active ? "" : undefined}
							className="drawer-front group/drawer flex flex-col items-center gap-1.5 rounded-sm border border-theme-border bg-theme-bg px-2 pb-2 pt-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
						>
							{/* The brass label holder, with the card slid into it. */}
							<span className="w-full max-w-[9rem] border border-theme-comment/60 px-0.5 py-0.5 text-center sm:px-1.5">
								<span
									className={
										"font-hand block whitespace-nowrap text-[0.8rem] leading-tight transition-colors sm:text-base " +
										(active
											? "text-theme-text-primary"
											: "text-theme-comment group-hover/drawer:text-theme-text-primary")
									}
								>
									{p === "popular" ? "popular" : KIND_META[p].title.toLowerCase()}
								</span>
								<span className="font-mono block text-[0.65rem] text-theme-comment">
									{onPage(p).length} {onPage(p).length === 1 ? "print" : "prints"}
								</span>
							</span>
							<span aria-hidden="true" className="drawer-pull h-1.5 w-8 rounded-full bg-theme-comment/70" />
						</button>
					);
				})}
			</div>

			{page !== "popular" && (
				<p className="-mt-3 mb-8 text-theme-text-secondary">
					{KIND_META[page].blurb}
				</p>
			)}

			{/* The open drawer's tray. Keyed, so changing drawers plays the
			    tray sliding out of the cabinet again. */}
			<div key={page} className="drawer-tray rounded-sm border-4 border-double border-theme-border px-3 pb-8 pt-4 sm:px-6">
				<ul
					ref={wallRef}
					id="cabinet-page"
					role="tabpanel"
					className="grid grid-cols-2 gap-x-5 gap-y-10 pt-4 sm:gap-x-[4vw] sm:gap-y-14 lg:grid-cols-3"
					onMouseLeave={() => onSpotlight(null)}
				>
					{onPage(page).map((s, i) => (
						<li
							key={s.id}
							className={i % 3 === 1 ? "lg:translate-y-8" : ""}
						>
							<Polaroid
								specimen={s}
								tilt={PHOTO_TILT[i % PHOTO_TILT.length]}
								tape={TAPE[i % TAPE.length]}
								delay={i * 0.7}
								onOpen={onOpen}
								onSpotlight={onSpotlight}
							/>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

// A print comes off the wall when it is dragged, and turns over once it is
// clear of its tape; let go and it drops back under the tape the other way
// up. Past this distance a press is a peel and not a click.
const PEEL_PX = 8;
const TURN_PX = 36;
const TILT_PER_PX_S = 0.012; // degrees of swing per px/s of drag speed
const MAX_SWING = 18;

function Polaroid({
	specimen,
	tilt,
	tape,
	delay,
	onOpen,
	onSpotlight,
}: {
	specimen: Specimen;
	tilt: number;
	tape: Strip[];
	delay: number;
	onOpen: (s: Specimen) => void;
	onSpotlight: (id: string | null) => void;
}) {
	const [back, setBack] = useState(false);
	const print = useRef<HTMLSpanElement>(null);
	const peel = useRef<{
		x: number;
		y: number;
		lastX: number;
		lastT: number;
		peeled: boolean;
		turned: boolean;
	} | null>(null);
	// A peel ends with a click on the same link, which must not open the card.
	const peeled = useRef(false);
	const t = specimen.taxonomy;
	const shiny = IRIDESCENT.has(specimen.id);

	const settle = () => {
		const el = print.current;
		if (!el) return;
		el.style.transition = "";
		el.style.transform = "";
		el.removeAttribute("data-lifted");
	};

	return (
		<SpecimenLink
			specimen={specimen}
			onOpen={onOpen}
			onMouseEnter={() => onSpotlight(specimen.id)}
			onMouseMove={shiny ? (e) => {
				// Where the light falls on the foil, as fractions of the print.
				const el = print.current;
				if (!el) return;
				const r = el.getBoundingClientRect();
				el.style.setProperty("--holo-x", String((e.clientX - r.left) / r.width));
				el.style.setProperty("--holo-y", String((e.clientY - r.top) / r.height));
			} : undefined}
			onFocus={() => onSpotlight(specimen.id)}
			onBlur={() => onSpotlight(null)}
			data-note={specimen.note}
			// The page's swipe-to-turn ignores anything marked as draggable.
			data-drag=""
			draggable={false}
			onPointerDown={(e) => {
				// A peel that ended off the print never got its click, so the
				// flag from it would swallow this one.
				peeled.current = false;
				if (e.button !== 0) return;
				peel.current = {
					x: e.clientX,
					y: e.clientY,
					lastX: e.clientX,
					lastT: e.timeStamp,
					peeled: false,
					turned: false,
				};
			}}
			onPointerMove={(e) => {
				const p = peel.current;
				const el = print.current;
				if (!p || !el) return;
				const dx = e.clientX - p.x;
				const dy = e.clientY - p.y;
				const dist = Math.hypot(dx, dy);
				if (!p.peeled) {
					// A finger moving mostly up or down is scrolling the page.
					if (dist < PEEL_PX || (e.pointerType === "touch" && Math.abs(dy) > Math.abs(dx))) return;
					p.peeled = true;
					e.currentTarget.setPointerCapture(e.pointerId);
					el.style.transition = "none";
					el.setAttribute("data-lifted", "");
				}
				const speed = (e.clientX - p.lastX) / Math.max(1, e.timeStamp - p.lastT) * 1000;
				p.lastX = e.clientX;
				p.lastT = e.timeStamp;
				const swing = Math.max(-MAX_SWING, Math.min(MAX_SWING, speed * TILT_PER_PX_S));
				el.style.transform = `translate(${dx}px, ${dy}px) rotate(${swing}deg)`;
				if (!p.turned && dist > TURN_PX) {
					p.turned = true;
					setBack((v) => !v);
				}
			}}
			onPointerUp={() => {
				if (peel.current?.peeled) peeled.current = true;
				peel.current = null;
				settle();
			}}
			onPointerCancel={() => {
				peel.current = null;
				settle();
			}}
			onClickCapture={(e) => {
				if (!peeled.current) return;
				peeled.current = false;
				e.preventDefault();
				e.stopPropagation();
			}}
			className="group block w-full touch-pan-y select-none text-left focus:outline-none"
		>
			{/* The tilt and the tape belong to the wall; only the print moves. */}
			<span
				className="relative block transition-[rotate] duration-300 group-hover:!rotate-0 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-theme-accent"
				style={{ rotate: `${tilt}deg` }}
			>
				{/* Framed in the text colour, not the brightest, so photos never outshine their names. */}
				<span
					ref={print}
					className="polaroid-print relative block bg-theme-text p-2.5 pb-1 shadow-[3px_5px_0_rgb(0_0_0_/_0.35)]"
				>
					{back ? (
						// The back of the print: what was pencilled on it when it
						// was filed. Keyed, so turning it over plays the flip.
						<span
							key="back"
							className="photo-turn font-hand flex h-24 flex-col justify-center gap-0.5 overflow-hidden bg-theme-text px-1 text-[0.7rem] leading-tight text-theme-bg sm:h-36 sm:px-3 sm:text-sm sm:leading-snug"
						>
							<span>found {t.described.toLowerCase()}.</span>
							<span className="line-clamp-2">lives in {t.habitat}.</span>
							<span className="line-clamp-2">eats {t.diet}.</span>
						</span>
					) : (
						<span key="front" className="photo-turn relative flex h-24 items-center justify-center overflow-hidden bg-theme-bg px-3 py-3 sm:h-36 sm:px-6 sm:py-4">
							<span
								className="specimen-idle h-full w-full max-w-[12rem] text-theme-text-primary transition-colors duration-300 group-hover:text-theme-accent group-focus-visible:text-theme-accent"
								// Out of step with each other, so the page never moves as
								// one piece.
								style={{ animationDelay: `-${delay}s` }}
							>
								<span
									data-face={FACES[specimen.id]}
									className="block h-full w-full transition-[scale] duration-200 motion-reduce:transition-none"
								>
									<Plate artwork={specimen.art} className="h-full w-full" />
								</span>
							</span>
							{shiny && <span aria-hidden="true" className="holo-foil pointer-events-none absolute inset-0" />}
						</span>
					)}
					<span className="font-hand block truncate px-1 pb-1 pt-1.5 text-sm text-theme-bg sm:text-lg">
						{specimen.name}
					</span>
				</span>
				{tape.map(([side, width, angle]) => (
					<span
						key={side}
						aria-hidden="true"
						className={
							"pointer-events-none absolute -top-2 h-6 bg-theme-comment/40 " +
							(side === "left" ? "-left-3" : "-right-3")
						}
						style={{ width: `${width}rem`, rotate: `${angle}deg` }}
					/>
				))}
			</span>

			<span className="mt-4 flex flex-col-reverse items-start gap-2 sm:mt-5 sm:flex-row sm:justify-between sm:gap-3">
				<span className="font-mono text-xs italic text-theme-comment">
					{specimen.binomial}
					<NpmCount
						specimen={specimen}
						className="block not-italic sm:inline sm:before:content-['_/_']"
					/>
				</span>
				<span className="flex shrink-0 items-center gap-2">
					
					<span className="stamp">{specimen.taxonomy.stage}</span>
				</span>
			</span>
			{shiny && <span className="font-hand mt-1 block text-sm text-theme-comment">iridescent, catches the light</span>}
			<span className="mt-2 block text-xs leading-snug text-theme-text sm:text-sm">
				{specimen.tagline}
			</span>
			<span className="font-hand mt-2 hidden -rotate-1 text-sm text-theme-text-secondary sm:block">
				{specimen.note}
			</span>
		</SpecimenLink>
	);
}

function SpecSheet({
	items,
	onOpen,
}: {
	items: Specimen[];
	onOpen: (s: Specimen) => void;
}) {
	return (
		<table className="w-full border-collapse text-left">
			<thead className="hidden md:table-header-group">
				<tr className="border-b-2 border-theme-text-primary text-sm text-theme-comment">
					<th className="py-2 pr-6 font-normal">Name</th>
					<th className="py-2 pr-6 font-normal">What it is</th>
					<th className="py-2 pr-6 font-normal">Kind</th>
					<th className="py-2 pr-6 font-normal">Language</th>
					<th className="py-2 pr-6 font-normal">Status</th>
					<th className="py-2 font-normal">Links</th>
				</tr>
			</thead>
			<tbody>
				{items.map((s) => (
					<tr
						key={s.id}
						className="grid border-b border-theme-border py-4 md:table-row md:py-0"
					>
						<td className="md:py-3 md:pr-6 md:align-top">
							<SpecimenLink
								specimen={s}
								onOpen={onOpen}
								className="font-display text-lg text-theme-text-primary underline decoration-theme-border underline-offset-4 transition-colors hover:decoration-theme-accent"
							>
								{s.name}
							</SpecimenLink>
						</td>
						<td className="text-theme-text-secondary md:py-3 md:pr-6 md:align-top">
							{s.tagline}
						</td>
						<td className="text-sm text-theme-comment md:py-3 md:pr-6 md:align-top">
							{KIND_META[s.kind].title}
						</td>
						<td className="text-sm text-theme-text md:py-3 md:pr-6 md:align-top">
							{s.taxonomy.order}
						</td>
						<td
							className={
								"text-sm md:py-3 md:pr-6 md:align-top " +
								(s.taxonomy.stage === "released"
									? "text-theme-text"
									: "text-theme-accent")
							}
						>
							{s.taxonomy.stage}
						</td>
						<td className="text-sm md:py-3 md:align-top">
							<span className="flex flex-wrap gap-x-3">
								<NpmCount specimen={s} className="text-theme-comment" />
								{s.links.map((l) => (
									<a
										key={l.href}
										href={l.href}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-block py-2 text-theme-accent underline decoration-theme-accent/40 underline-offset-2 hover:decoration-theme-accent md:py-0"
									>
										{l.label}
									</a>
								))}
							</span>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
