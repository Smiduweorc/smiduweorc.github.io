import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Vivarium } from "./vivarium/Vivarium";
import { Cabinet } from "./Cabinet";
import { FoodWeb } from "./FoodWeb";
import { SpecimenCard } from "./SpecimenCard";
import { SettingsButton } from "./SettingsButton";
import { Lens, MagnifierToggle, useCoarsePointer } from "./Magnifier";
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
import { type Reading, type Specimen } from "./specimens";

const ORG_URL = "https://github.com/Smiduweorc";

// The right gutter is wider from tablet up: the rail the lens, the lighting
// and Baggie stand in, so they never sit on the page. Desktop also fits his
// speech bubble.
const GUTTER = "px-[max(4vmin,20px)] md:pr-24 lg:pr-44";

// Type has one job per face, everywhere on the page:
//   display (Fraunces)  the name and the entry headings
//   sans (Plex Sans)    anything you read as prose
//   hand (Shantell)     anything written by hand: notes, labels on photos
//   mono (Plex Mono)    catalogue data: plate numbers, stamps, download counts

function Plaque() {
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
	children,
}: {
	plate: number;
	title: string;
	margin: string;
	aside?: ReactNode;
	bagwormLine?: string;
	note?: string;
	/** Spread down the whole margin so a long entry's margin is never bare. */
	keepsake?: ReactNode[];
	children: ReactNode;
}) {
	return (
		<section
			data-bagworm-line={bagwormLine}
			data-note={note}
			className="grid gap-x-8 gap-y-3 py-[6vmin] md:grid-cols-[var(--margin)_1fr]"
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
							<div key={i}>{k}</div>
						))}
					</div>
				)}
			</div>
			<div className="min-w-0">
				<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h2 className="font-display text-3xl font-semibold text-theme-text-primary sm:text-4xl">
							{title}
						</h2>
						<InkUnderline className="mt-1 w-32 text-theme-comment" />
					</div>
					{aside}
				</div>
				{children}
			</div>
		</section>
	);
}

/** The org profile's opinions, word for word. Ordered so each row pairs
 *  items of similar length. */
const OPINIONS = [
	"Solve one problem (or type of problem) well.",
	"Keep dependencies to a minimum.",
	"We force you to make safe/opinionated default choices.",
	"Ship software we'd actually want to use ourselves.",
	"AI is fine, so long used reasonably. One human can't know everything.",
	"DECIDE EARLY, DETAILS MATTER NEVER \"just do an MVP and make changes later\"! (Be it a spec or anything, this is important!)",
	"We are language agnostic in a sense that we use whatever language is best suited for us to solve a problem, we pick up a language to use when ever needed, we don't force a runtime to do something it should not be doing.",
	"We do this for the love of the game and we do not care about \"establishing a userbase or community\", unless there is a good reason (e.g. getting usability opinions).",
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
			<div id="food-web">
				<FoodWeb onOpen={onOpen} />
			</div>
		</div>
	);
}

function App() {
	const [open, setOpen] = useState<Specimen | null>(null);
	const [lensOn, setLensOn] = useState(false);
	const [gateOpen, setGateOpen] = useState(() => !hasBeenGreeted());
	const [theme, setTheme] = useState<Theme>(() => initializeTheme());
	const [reading, setReading] = useState<Reading>("guide");
	// The photo under the pointer, so its animal in the tank can light up.
	const [spotlight, setSpotlight] = useState<string | null>(null);
	const coarse = useCoarsePointer();

	const openSpecimen = useCallback((s: Specimen) => {
		setOpen(s);
	}, []);

	useEffect(() => {
		if (!open?.quip) return;
		const heading = document.getElementById("specimen-card-title");
		bagwormQuip(heading, open.quip);
	}, [open]);

	const dismissGate = useCallback(() => {
		markGreeted();
		setGateOpen(false);
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
				<Plaque />

				<main id="journal" tabIndex={-1} className="journal-page relative outline-none rounded-sm bg-theme-panel px-[max(3vmin,16px)] shadow-[3px_5px_0_rgb(0_0_0_/_0.3)] [--margin:9rem] lg:[--margin:12rem]">
					<StrayAnt />
					<Entry
						plate={1}
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
						bagwormLine="tabs! click them! that's what they're for!"
					>
						<Cabinet
							reading={reading}
							onOpen={openSpecimen}
							onSpotlight={setSpotlight}
						/>
					</Entry>

					<Entry
						plate={2}
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

			{gateOpen ? (
				<BagwormGate onDone={dismissGate} />
			) : (
				<BagwormParked sceneKey={open ? `card:${open.id}` : "collection"} />
			)}

			<SpecimenCard
				specimen={open}
				reading={reading}
				onClose={() => setOpen(null)}
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
