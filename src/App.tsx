import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { Vivarium } from "./vivarium/Vivarium";
import { Cabinet } from "./Cabinet";
import { FoodWeb } from "./FoodWeb";
import { SpecimenCard } from "./SpecimenCard";
import { SettingsButton } from "./SettingsButton";
import { Lens, MagnifierToggle } from "./Magnifier";
import { useCoarsePointer } from "./media";
import { specimenAt, specimenPath } from "./route";
import { pageMeta } from "./seo";
import { InkSquiggle, InkUnderline } from "./Ink";
import { StrayAnt } from "./StrayAnt";
import {
	AntTracks,
	CoffeeRing,
	Dirt,
	Feather,
	Frond,
	LongLeaf,
	PressedLeaf,
	TapeScrap,
} from "./Keepsakes";
import { BagwormGate, BagwormParked, bagwormQuip } from "./bagworm/Bagworm";
import { initializeTheme, type Theme } from "./theme";
import { hasBeenGreeted, markGreeted } from "./greeting";
import { SPECIMENS, type Reading, type Specimen } from "./specimens";
import { SpecimenLink } from "./SpecimenLink";
import { Plate } from "./vivarium/artwork";

const ORG_URL = "https://github.com/Smiduweorc";

// The journal shows one page at a time, so nothing on it can be scrolled
// past on the way to something else. Every page is in the HTML regardless:
// the inline script in index.html marks the document as scripted, and only
// then does index.css put the other pages away.
const PAGES = [
	{ id: "collection", title: "the collection" },
	{ id: "food-web", title: "food web" },
	{ id: "opinions", title: "opinions" },
	{ id: "elsewhere", title: "elsewhere" },
] as const;
type PageId = (typeof PAGES)[number]["id"];

const pageFromHash = (hash: string): PageId | null =>
	PAGES.find((p) => `#${p.id}` === hash)?.id ?? null;

// A swipe has to be this long, and mostly sideways, to turn the page.
const SWIPE_PX = 60;

const OBSERVED_KEY = "smiduweorc-observed";

function observedSoFar(): Set<string> {
	try {
		const ids: unknown = JSON.parse(localStorage.getItem(OBSERVED_KEY) ?? "[]");
		// Anything that has since left the collection is dropped.
		return new Set(
			Array.isArray(ids) ? SPECIMENS.map((s) => s.id).filter((id) => ids.includes(id)) : [],
		);
	} catch {
		// Blocked or unreadable: the tally starts from nothing.
		return new Set();
	}
}

function storeObserved(ids: ReadonlySet<string>): void {
	try {
		localStorage.setItem(OBSERVED_KEY, JSON.stringify([...ids]));
	} catch {
		// the tally still counts for this visit
	}
}

// The right gutter is wider from tablet up: the rail the lens, the lighting
// and Baggie stand in, so they never sit on the page. Desktop also fits his
// speech bubble.
const GUTTER = "px-[max(4vmin,20px)] md:pr-24 lg:pr-44";

// Type has one job per face, everywhere on the page:
//   display (Fraunces)  the name and the entry headings
//   sans (Plex Sans)    anything you read as prose
//   hand (Shantell)     anything written by hand: notes, labels on photos
//   mono (Plex Mono)    catalogue data: plate numbers, stamps, download counts

function Plaque({ observed }: { observed: number }) {
	return (
		<div className="grid gap-x-[6vw] gap-y-6 pb-[6vmin] pt-[5vmin] lg:grid-cols-[auto_1fr]">
			<div data-note="'smiþ' as in smith, 'weorc' as in work. the þ is a thorn, it says 'th'.">
				<h1 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-none tracking-tight text-theme-text-primary">
					Smiduweorc
				</h1>
				<p className="mt-3 font-mono text-sm italic text-theme-text-secondary">
					smiþ-weorc, OE. smith-work
				</p>
				<p className="mt-1 font-mono text-xs text-theme-comment">est. 2026</p>
				<p
					data-note="every card you open gets ticked off here. kept in this browser only."
					className="mt-1 font-mono text-xs text-theme-comment"
				>
					observed {observed} of {SPECIMENS.length}
				</p>
			</div>
			<div
				data-note="every project is named after a real animal that does the same job."
				className="self-end"
			>
				<p className="font-hand mb-3 -rotate-[0.5deg] text-[clamp(1.25rem,1.8vw,1.75rem)] text-theme-accent">
					Half Code, Half Insect Documentary.
				</p>
				<p className="max-w-[52ch] leading-relaxed text-theme-text">
					Most of our projects only exist after being forced to implement
					something multiple times and we just like to save time. (Also, we
					do not focus on cybersecurity.)
				</p>
			</div>
		</div>
	);
}

function Entry({
	plate,
	title,
	margin,
	aside,
	bagwormLine,
	note,
	keepsake,
	finds = [],
	onOpen,
	id,
	current,
	next,
	onTurn,
	children,
}: {
	id: PageId;
	current: boolean;
	onTurn: (to: PageId) => void;
	plate: number;
	title: string;
	margin: string;
	aside?: ReactNode;
	bagwormLine?: string;
	note?: string;
	/** Spread down the whole margin so a long entry's margin is never bare. */
	keepsake?: ReactNode[];
	/** What is under each keepsake, by position. */
	finds?: (Specimen | undefined)[];
	onOpen: (s: Specimen) => void;
	/** The page after this one, linked from its foot. */
	next?: (typeof PAGES)[number];
	children: ReactNode;
}) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-title`}
			data-current={current || undefined}
			data-bagworm-line={bagwormLine}
			data-note={note}
			className="journal-section grid gap-x-8 gap-y-3 py-[6vmin] md:grid-cols-[var(--margin)_1fr]"
		>
			{/* h-0 plus min-h-full: the margin stretches to the entry but
			    never sets its height, so keepsakes cannot leave a gap. */}
			<div className="md:flex md:h-0 md:min-h-full md:flex-col md:overflow-hidden md:pt-1">
				<p className="font-mono text-xs uppercase tracking-widest text-theme-comment">
					Section No. {plate}
				</p>
				<p className="font-hand mt-2 hidden -rotate-2 text-sm leading-snug text-theme-text-secondary md:block">
					{margin}
				</p>
				{keepsake && (
					<div className="mt-8 hidden flex-1 flex-col gap-16 md:flex">
						{keepsake.map((k, i) => (
							<Keepsake key={i} find={finds[i]} onOpen={onOpen}>
								{k}
							</Keepsake>
						))}
					</div>
				)}
			</div>
			<div className="min-w-0">
				<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h2
							id={`${id}-title`}
							className="font-display text-3xl font-semibold text-theme-text-primary sm:text-4xl"
						>
							{title}
						</h2>
						<InkUnderline className="mt-1 w-32 text-theme-comment" />
					</div>
					{aside}
				</div>
				{children}
				{next && (
					<a
						href={`#${next.id}`}
						onClick={(e) => {
							e.preventDefault();
							onTurn(next.id);
						}}
						className="font-hand mt-12 flex justify-end text-lg text-theme-text-secondary hover:text-theme-accent"
					>
						<span className="-rotate-1 border-b border-theme-border pb-0.5">
							turn the page: {next.title}
						</span>
					</a>
				)}
			</div>
		</section>
	);
}

/** Index tabs along the top edge of the journal, one per page. */
function PageTabs({ page, onTurn }: { page: PageId; onTurn: (to: PageId) => void }) {
	return (
		<nav aria-label="Journal pages" className="-mb-px flex gap-1 overflow-x-auto px-2 sm:gap-2 sm:px-6">
			{PAGES.map((p, i) => {
				const here = p.id === page;
				return (
					<a
						key={p.id}
						href={`#${p.id}`}
						aria-current={here ? "page" : undefined}
						onClick={(e) => {
							e.preventDefault();
							onTurn(p.id);
						}}
						className={
							"journal-tab font-hand shrink-0 whitespace-nowrap rounded-t-md px-3 pb-1.5 pt-2 text-base transition-colors sm:px-4 sm:text-lg " +
							(here
								? "bg-theme-panel text-theme-text-primary"
								: "bg-theme-border/40 text-theme-comment hover:bg-theme-border/70 hover:text-theme-text-primary")
						}
					>
						<span className="mr-1.5 font-mono text-xs">{i + 1}</span>
						{p.title}
					</a>
				);
			})}
		</nav>
	);
}

// The animals with no place in the tank are the ones under things in the
// margins, one under each keepsake that has something under it.
const UNDERFOOT = SPECIMENS.filter((s) => !s.inTank);

/** A keepsake that can be picked up. Under it is one of the specimens that
 *  has no place in the tank, linked to its page. */
function Keepsake({
	find,
	onOpen,
	children,
}: {
	find?: Specimen;
	onOpen: (s: Specimen) => void;
	children: ReactNode;
}) {
	const [lifted, setLifted] = useState(false);
	if (!find) return <div>{children}</div>;
	return (
		<div className="relative">
			<div
				className={
					"absolute inset-0 flex flex-col items-center justify-center " +
					(lifted ? "z-10" : "invisible")
				}
			>
				<SpecimenLink
					specimen={find}
					onOpen={onOpen}
					className="flex flex-col items-center text-theme-text-secondary hover:text-theme-accent"
				>
					<Plate artwork={find.art} className="h-10 w-16" />
					<span className="font-hand text-sm text-theme-text-primary">{find.name}</span>
				</SpecimenLink>
			</div>
			<button
				type="button"
				aria-expanded={lifted}
				aria-label={lifted ? "Put it back down" : "Look under it"}
				data-note={lifted ? undefined : "something might be living under this."}
				data-lifted={lifted || undefined}
				onClick={() => setLifted((v) => !v)}
				className="keepsake-lift relative block"
			>
				{children}
			</button>
		</div>
	);
}

/** The org profile's opinions, word for word. Keep the two in step. */
const OPINIONS = [
	"Solve one problem well. A problem can be a group of related items, so this is not the Unix philosophy. When the sub-problems multiply, make an informed decision about where the boundary goes. (The mission comes first, and information helps you decide. If you lack information, decide how to get it.)",
	"Keep dependencies to a minimum.",
	"We force you to make safe, opinionated default choices.",
	"Ship software we'd actually want to use ourselves.",
	"AI is fine, so long as it is used reasonably. One human can't know everything. (No vibecoding: work is reviewed, or done by competent humans.)",
	"DECIDE EARLY, DETAILS MATTER. Never \"just do an MVP and make changes later\"! (Be it a spec or anything else, this is important!)",
	"We are language agnostic: we use whichever language best suits the problem, pick one up whenever needed, and don't force a runtime to do something it shouldn't be doing.",
	"We do this for the love of the game. We never advertise ourselves, and we don't care about \"establishing a userbase or community\" unless there is a good reason (e.g. getting usability opinions). These libraries are for us; if you find one useful, good for you.",
	"We refuse blind compliance (if we adopt an RFC, there is a reason).",
	"We are not anti-agile, we just don't really use it.",
	"Have a little fun along the way.",
	"Our libraries are generally insects.",
];

/** Lines are sized to sit on the journal's 32px ruling from desktop up. */
function Opinions() {
	return (
		<ol className="grid gap-x-16 lg:grid-cols-2">
			{OPINIONS.map((o, i) => (
				<li key={o} className="flex gap-4 pb-4 leading-7 lg:pb-8 lg:leading-8">
					<span className="w-6 shrink-0 font-mono text-xs leading-7 text-theme-comment lg:leading-8">
						{String(i + 1).padStart(2, "0")}
					</span>
					<span className="text-theme-text">{o}</span>
				</li>
			))}
		</ol>
	);
}

function ReadingToggle({
	reading,
	onChange,
}: {
	reading: Reading;
	onChange: (r: Reading) => void;
}) {
	const options: [Reading, string][] = [
		["guide", "field guide"],
		["spec", "spec sheet"],
	];
	return (
		<div
			role="group"
			aria-label="Read the collection as"
			className="flex items-center gap-1 rounded-sm border border-theme-border p-1"
			data-note="same facts both ways. one has the jokes in."
		>
			{options.map(([value, label]) => (
				<button
					key={value}
					type="button"
					aria-pressed={reading === value}
					onClick={() => onChange(value)}
					className={
						"rounded-sm px-3 py-2 text-sm transition-colors sm:py-1 " +
						(reading === value
							? "bg-theme-accent text-theme-bg"
							: "text-theme-text-secondary hover:text-theme-text-primary")
					}
				>
					{label}
				</button>
			))}
		</div>
	);
}

/** The food web, laid open on the page. */
function WebPage({ onOpen }: { onOpen: (s: Specimen) => void }) {
	return (
		<div>
			<p className="mb-10 max-w-[60ch] text-theme-text-secondary">
				Which animal came from which, and which jobs they pass to each other.
				Solid lines means parent-child projects dashed lines are work handed to a sibling.
			</p>
			<FoodWeb onOpen={onOpen} />
		</div>
	);
}

function App({ path }: { path: string }) {
	const [open, setOpen] = useState<Specimen | null>(() => specimenAt(path));
	const [lensOn, setLensOn] = useState(false);
	// "pending" is what the prerendered HTML holds: the build cannot know
	// whether this visitor has met Bagworm, so he is left out until it does.
	const [gate, setGate] = useState<"pending" | "open" | "done">("pending");
	const [theme, setTheme] = useState<Theme>(() => initializeTheme());
	const [reading, setReading] = useState<Reading>("guide");
	// The photo under the pointer, so its animal in the tank can light up.
	const [spotlight, setSpotlight] = useState<string | null>(null);
	const coarse = useCoarsePointer();

	// Which specimens this visitor has opened a card for. Empty in the
	// prerendered HTML and filled from storage once it hydrates.
	const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
	useEffect(() => setSeen(observedSoFar()), []);
	useEffect(() => {
		if (!open) return;
		setSeen((prev) => {
			if (prev.has(open.id)) return prev;
			const next = new Set(prev).add(open.id);
			storeObserved(next);
			return next;
		});
	}, [open]);
	const complete = seen.size === SPECIMENS.length;
	useEffect(() => {
		if (!complete || !open) return;
		bagwormQuip(
			document.getElementById("specimen-card-title"),
			"that's all of them! you've seen the whole collection.",
		);
	}, [complete, open]);

	// The first page in the prerendered HTML, whatever the address says: the
	// build cannot see the hash. The layout effect corrects it before paint.
	const [page, setPage] = useState<PageId>("collection");
	const [turnedFrom, setTurnedFrom] = useState<"left" | "right">("right");
	const journalRef = useRef<HTMLElement>(null);
	useLayoutEffect(() => {
		const fromHash = pageFromHash(location.hash);
		if (fromHash) setPage(fromHash);
	}, []);

	const turnTo = useCallback((to: PageId) => {
		turnedByHand.current = true;
		setPage((from) => {
			if (from === to) return from;
			const order = (id: PageId) => PAGES.findIndex((p) => p.id === id);
			setTurnedFrom(order(to) > order(from) ? "right" : "left");
			return to;
		});
		history.replaceState(null, "", `${location.pathname}#${to}`);
		// The new page starts at its top, so the reader is taken there if
		// they had scrolled down past it.
		const top = journalRef.current?.getBoundingClientRect().top ?? 0;
		if (top < 0) {
			journalRef.current?.scrollIntoView({
				block: "start",
				behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
			});
		}
	}, []);
	const turnBy = useCallback(
		(step: 1 | -1) => {
			const i = PAGES.findIndex((p) => p.id === page) + step;
			if (i >= 0 && i < PAGES.length) turnTo(PAGES[i].id);
		},
		[page, turnTo],
	);

	// Bagworm follows scrolling, and a page turn does not scroll, so he is
	// sent over to the new page's heading with its line. Only for a turn
	// the visitor made: not the page an address opened on, nor Back.
	const turnedByHand = useRef(false);
	useEffect(() => {
		if (!turnedByHand.current) return;
		turnedByHand.current = false;
		const section = document.getElementById(page);
		const line = section?.dataset.bagwormLine;
		if (line) bagwormQuip(section.querySelector("h2"), line);
	}, [page]);

	// Arrow keys turn the page, unless something focused has its own use for them.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
			const target = e.target as HTMLElement;
			if (target.closest("input, textarea, select, [contenteditable], [role=tablist], [role=dialog]")) return;
			if (document.querySelector("[role=dialog]")) return;
			turnBy(e.key === "ArrowRight" ? 1 : -1);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [turnBy]);

	// A sideways swipe on the page turns it. Not one that starts on
	// something you drag, or inside something that scrolls sideways itself.
	// Touch events, not pointer events: the browser cancels the pointer as
	// soon as it treats the finger as a scroll, but touchend still arrives.
	const swipe = useRef<{ x: number; y: number } | null>(null);
	const onJournalTouchStart = (e: React.TouchEvent) => {
		const target = e.target as HTMLElement;
		const t = e.touches[0];
		swipe.current =
			e.touches.length === 1 && !target.closest("[data-drag], .overflow-x-auto")
				? { x: t.clientX, y: t.clientY }
				: null;
	};
	const onJournalTouchEnd = (e: React.TouchEvent) => {
		const s = swipe.current;
		swipe.current = null;
		const t = e.changedTouches[0];
		if (!s || !t) return;
		const dx = t.clientX - s.x;
		const dy = t.clientY - s.y;
		if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 2) turnBy(dx < 0 ? 1 : -1);
	};

	const openSpecimen = useCallback((s: Specimen) => {
		setOpen(s);
		history.pushState(null, "", specimenPath(s) + location.hash);
	}, []);
	const closeSpecimen = useCallback(() => {
		setOpen(null);
		history.pushState(null, "", "/" + location.hash);
	}, []);

	useEffect(() => {
		const onPop = () => {
			setOpen(specimenAt(location.pathname));
			const fromHash = pageFromHash(location.hash);
			if (fromHash) setPage(fromHash);
		};
		window.addEventListener("popstate", onPop);
		window.addEventListener("hashchange", onPop);
		return () => {
			window.removeEventListener("popstate", onPop);
			window.removeEventListener("hashchange", onPop);
		};
	}, []);

	useEffect(() => {
		document.title = pageMeta(open).title;
	}, [open]);

	// A layout effect, so the greeting is up before the hydrated page paints.
	// Someone who followed a link to one specimen came for that specimen:
	// the greeting waits for their first look at the front page.
	useLayoutEffect(() => {
		setGate(!specimenAt(path) && !hasBeenGreeted() ? "open" : "done");
	}, [path]);
	// index.html blanks the page for a first visit until this script is in
	// charge of it. See the gate cover in index.css.
	useEffect(() => {
		document.documentElement.removeAttribute("data-gate");
	}, []);

	useEffect(() => {
		if (!open?.quip) return;
		const heading = document.getElementById("specimen-card-title");
		bagwormQuip(heading, open.quip);
	}, [open]);

	const dismissGate = useCallback(() => {
		markGreeted();
		setGate("done");
	}, []);

	return (
		// overflow-x-clip: the stray ant walks off the journal's right edge, and
		// without this the whole page grows sideways to follow it.
		<div className="min-h-screen overflow-x-clip bg-theme-bg text-theme-text antialiased">
			{/* The tank is two dozen tab stops; this jumps past them. */}
			<a
				href="#journal"
				className="fixed left-4 top-4 z-[80] -translate-y-24 rounded-sm bg-theme-accent px-4 py-2 font-medium text-theme-bg transition-transform focus:translate-y-0"
			>
				Skip to the collection
			</a>
			<Vivarium onOpen={openSpecimen} spotlight={spotlight} />

			<div className={GUTTER}>
				<Plaque observed={seen.size} />

				<PageTabs page={page} onTurn={turnTo} />
				<main
					id="journal"
					ref={journalRef}
					tabIndex={-1}
					data-turned-from={turnedFrom}
					onTouchStart={onJournalTouchStart}
					onTouchEnd={onJournalTouchEnd}
					onTouchCancel={() => (swipe.current = null)}
					// pan-y: vertical scrolling and pinch zoom stay with the
					// browser, and a sideways swipe comes to the swipe handler
					// above instead of being taken as the browser's own back
					// gesture. The food web and the tabs scroll themselves.
					className="journal-page relative touch-pan-y outline-none rounded-sm bg-theme-panel px-[max(3vmin,16px)] shadow-[3px_5px_0_rgb(0_0_0_/_0.3)] [--margin:9rem] lg:[--margin:12rem]"
				>
					<StrayAnt />
					<Entry
						plate={1}
						id="collection"
						current={page === "collection"}
						next={PAGES[1]}
						onTurn={turnTo}
						onOpen={openSpecimen}
						finds={[UNDERFOOT[0], undefined, UNDERFOOT[1], undefined, undefined, UNDERFOOT[2]]}
						title="the collection"
						margin="click one. it'll tell you everything we know about it."
						aside={<ReadingToggle reading={reading} onChange={setReading} />}
						keepsake={[
							<TapeScrap className="ml-10" angle={-14} />,
							<LongLeaf className="ml-12" />,
							<Dirt className="ml-2" />,
							<PressedLeaf className="ml-6" />,
							<TapeScrap className="ml-4" angle={9} />,
							<Frond className="ml-14" />,
							<Dirt className="ml-8 rotate-90" />,
						]}
						bagwormLine="drawers! pull them out! that's what the handles are for!"
					>
						<Cabinet
							reading={reading}
							onOpen={openSpecimen}
							onSpotlight={setSpotlight}
						/>
					</Entry>

					<Entry
						plate={2}
						id="food-web"
						current={page === "food-web"}
						next={PAGES[2]}
						onTurn={turnTo}
						onOpen={openSpecimen}
						finds={[UNDERFOOT[3]]}
						title="food web"
						margin="we don't expect anyone one else to really use these. our libraries were made because we kept rewriting the same code."
						bagwormLine="it's a family tree. a weird one."
						keepsake={[
							<PressedLeaf className="ml-4" />,
							<Dirt className="ml-10" />,
							<LongLeaf className="ml-10" />,
						]}
					>
						<WebPage onOpen={openSpecimen} />
					</Entry>

					<Entry
						plate={3}
						id="opinions"
						current={page === "opinions"}
						next={PAGES[3]}
						onTurn={turnTo}
						onOpen={openSpecimen}
						finds={[UNDERFOOT[4]]}
						title="opinions"
						margin="written down so they can be argued with, not so they can be admired."
						bagwormLine="the boring-but-true bit."
						keepsake={[
							<Frond className="ml-10" />,
							<TapeScrap className="ml-6" angle={-20} />,
							<Dirt className="ml-4 -rotate-45" />,
						]}
					>
						<div className="relative">
							<CoffeeRing className="absolute -bottom-6 left-[38%] hidden w-36 rotate-12 lg:block" />
							<Opinions />
						</div>
					</Entry>

					<Entry
						plate={4}
						id="elsewhere"
						current={page === "elsewhere"}
						next={undefined}
						onTurn={turnTo}
						onOpen={openSpecimen}
						finds={[UNDERFOOT[5]]}
						title="elsewhere"
						margin="no contact form. the issue tracker is the contact form."
						bagwormLine="the doors out. don't be a stranger."
						keepsake={[<Feather className="ml-8" />, <Dirt className="ml-14 scale-75" />]}
					>
						<p className="mb-5 max-w-[60ch] text-theme-text-secondary">
							It is all public. Issues and pull requests get read, and
							nothing here is too precious to argue about.
						</p>
						<a
							href={ORG_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="font-hand inline-flex -rotate-1 items-center gap-2 rounded-sm border-2 border-theme-accent px-4 py-1.5 text-lg text-theme-accent transition-colors hover:bg-theme-accent/10"
						>
							the org on GitHub ↗
						</a>
						<span className="ml-5 inline-flex flex-wrap gap-x-5 align-middle">
							{[
								["lacewing on npm", "https://www.npmjs.com/package/lacewing"],
								["lacewing docs", "https://smiduweorc.github.io/lacewing/"],
							].map(([label, href]) => (
								<a
									key={href}
									href={href}
									target="_blank"
									rel="noopener noreferrer"
									className="font-hand inline-block py-2 text-lg text-theme-text underline decoration-theme-border underline-offset-4 transition-colors hover:decoration-theme-accent"
								>
									{label} ↗
								</a>
							))}
						</span>
						<AntTracks className="mt-10 w-64 max-w-full -rotate-2" />
					</Entry>
				</main>

				<footer
					data-note="he is called baggie. he lives here. please do not feed him."
					className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-8"
				>
					<div>
						<InkSquiggle className="mb-3 text-theme-border" />
						<p className="font-mono text-xs text-theme-comment">
							smiduweorc / <span className="italic">smiþ-weorc</span>, OE.
							smith-work.
						</p>
					</div>
					<p className="font-hand -rotate-2 text-lg text-theme-text-secondary">
						kept by Baggie Da Bagworm
					</p>
				</footer>
			</div>

			{gate === "open" && <BagwormGate onDone={dismissGate} />}
			{gate === "done" && (
				<BagwormParked sceneKey={open ? `card:${open.id}` : "collection"} />
			)}

			<SpecimenCard
				specimen={open}
				reading={reading}
				onClose={closeSpecimen}
			/>
			<Lens active={lensOn && !coarse} onDismiss={() => setLensOn(false)} />

			<div className="lens-exempt fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
				{/* No pointer on touch, so nothing for the lens to follow. */}
				{!coarse && (
					<MagnifierToggle on={lensOn} onToggle={() => setLensOn((v) => !v)} />
				)}
				<SettingsButton currentTheme={theme} onThemeChange={setTheme} />
			</div>
		</div>
	);
}

export default App;
