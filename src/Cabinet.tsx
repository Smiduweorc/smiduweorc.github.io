import { useEffect, useRef, useState } from "react";
import { Plate } from "./vivarium/artwork";
import { InkUnderline } from "./Ink";
import { NpmCount } from "./NpmCount";
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
	cephalote: "right",
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
		window.addEventListener("pointermove", onMove);
		return () => {
			window.removeEventListener("pointermove", onMove);
			cancelAnimationFrame(raf);
		};
	}, []);

	if (reading === "spec") return <SpecSheet items={SPECIMENS} onOpen={onOpen} />;

	const pages: Page[] = ["popular", ...KIND_ORDER];
	return (
		<div>
			<div
				role="tablist"
				aria-label="Which part of the collection"
				className="mb-8 flex flex-wrap gap-x-6 gap-y-2"
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
							className={
								"relative py-2 font-hand text-lg transition-colors sm:py-0 " +
								(active
									? "text-theme-text-primary"
									: "text-theme-comment hover:text-theme-text-primary")
							}
						>
							{p === "popular" ? "popular" : KIND_META[p].title.toLowerCase()}{" "}
							<span className="font-mono text-xs text-theme-comment">
								{onPage(p).length}
							</span>
							{/* Under the label, not in the flow: in the flow it stretches the tab. */}
							<span
								aria-hidden="true"
								className={
									"absolute inset-x-0 -bottom-2 transition-opacity " +
									(active ? "opacity-100" : "opacity-0")
								}
							>
								<InkUnderline className="text-theme-accent" />
							</span>
						</button>
					);
				})}
			</div>

			{page !== "popular" && (
				<p className="-mt-3 mb-8 text-theme-text-secondary">
					{KIND_META[page].blurb}
				</p>
			)}

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
	);
}

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
	return (
		<button
			type="button"
			onClick={() => onOpen(specimen)}
			onMouseEnter={() => onSpotlight(specimen.id)}
			onFocus={() => onSpotlight(specimen.id)}
			onBlur={() => onSpotlight(null)}
			data-note={specimen.note}
			className="group block w-full text-left focus:outline-none"
		>
			{/* Framed in the text colour, not the brightest, so photos never outshine their names. */}
			<span
				className="relative block bg-theme-text p-2.5 pb-1 shadow-[3px_5px_0_rgb(0_0_0_/_0.35)] transition-[rotate] duration-300 group-hover:!rotate-0 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-theme-accent"
				style={{ rotate: `${tilt}deg` }}
			>
				{tape.map(([side, width, angle]) => (
					<span
						key={side}
						aria-hidden="true"
						className={
							"absolute -top-2 h-6 bg-theme-comment/40 " +
							(side === "left" ? "-left-3" : "-right-3")
						}
						style={{ width: `${width}rem`, rotate: `${angle}deg` }}
					/>
				))}
				<span className="flex h-24 items-center justify-center overflow-hidden bg-theme-bg px-3 py-3 sm:h-36 sm:px-6 sm:py-4">
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
				</span>
				<span className="font-hand block truncate px-1 pb-1 pt-1.5 text-sm text-theme-bg sm:text-lg">
					{specimen.name}
				</span>
			</span>

			<span className="mt-4 flex flex-col-reverse items-start gap-2 sm:mt-5 sm:flex-row sm:justify-between sm:gap-3">
				<span className="font-mono text-xs italic text-theme-comment">
					{specimen.binomial}
					<NpmCount
						specimen={specimen}
						className="block not-italic sm:inline sm:before:content-['_/_']"
					/>
				</span>
				<span className="stamp shrink-0">{specimen.taxonomy.stage}</span>
			</span>
			<span className="mt-2 block text-xs leading-snug text-theme-text sm:text-sm">
				{specimen.tagline}
			</span>
			<span className="font-hand mt-2 hidden -rotate-1 text-sm text-theme-text-secondary sm:block">
				{specimen.note}
			</span>
		</button>
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
							<button
								type="button"
								onClick={() => onOpen(s)}
								className="text-left font-display text-lg text-theme-text-primary underline decoration-theme-border underline-offset-4 transition-colors hover:decoration-theme-accent"
							>
								{s.name}
							</button>
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
