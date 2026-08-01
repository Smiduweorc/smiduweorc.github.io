import { useCallback, useEffect, useState } from "react";
import { Vivarium } from "./vivarium/Vivarium";
import { Cabinet } from "./Cabinet";
import { SpecimenCard } from "./SpecimenCard";
import { SettingsButton } from "./SettingsButton";
import { Lens, MagnifierToggle, useCoarsePointer } from "./Magnifier";
import { InkUnderline, InkSquiggle } from "./Ink";
import { BagwormGate, BagwormParked, bagwormQuip } from "./bagworm/Bagworm";
import { initializeTheme, type Theme } from "./theme";
import { hasBeenGreeted, markGreeted } from "./greeting";
import { type Specimen } from "./specimens";

const ORG_URL = "https://github.com/Smiduweorc";

/** The wall label under the tank: brass plate, two columns, no preamble. */
function Plaque() {
	return (
		<div className="grid gap-x-8 gap-y-4 border-y border-theme-border bg-theme-panel/30 px-5 py-5 sm:grid-cols-[13rem_1fr] sm:px-6">
			<div data-note="'smiþ' as in smith, 'weorc' as in work. the þ is a thorn, it says 'th'.">
				<p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-theme-comment">
					collection
				</p>
				{/* The page's h1. It used to be etched across the tank, which
				    was a lot of shouting for a wall label to compete with. */}
				<h1 className="font-display text-2xl text-theme-text-primary">
					Smiduweorc
				</h1>
				<p className="font-mono text-xs italic text-theme-text-secondary">
					smiþ-weorc, OE. smith-work
				</p>
				<p className="mt-2 font-mono text-[0.6875rem] leading-relaxed text-theme-comment">
					est. 2026
				</p>
			</div>
			<div
				data-note="every project is named after a real animal that does the same job."
				className="border-t border-theme-border/60 pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"
			>
				<p className="font-hand mb-2 -rotate-[0.5deg] text-lg text-theme-accent">
					Half Code, Half Insect Documentary.
				</p>
				<p className="leading-relaxed text-theme-text-secondary">
					Developer tools and libraries that each do one job, named after the
					animal that already does it. A{" "}
					<span className="text-theme-text-primary">lacewing</span> eats the
					things that ruin your garden. Ours eats forged tokens. It sticks in
					your head better than{" "}
					<code className="font-mono text-sm text-theme-comment">
						jwt-utils-v2-final
					</code>
					.
				</p>
			</div>
		</div>
	);
}

function SectionHeading({
	plate,
	children,
	id,
}: {
	plate: number;
	children: React.ReactNode;
	id?: string;
}) {
	return (
		<div id={id} className="mb-5 scroll-mt-6">
			<p className="font-mono text-xs uppercase tracking-widest text-theme-comment">
				plate no. {plate}
			</p>
			<h2 className="font-display text-3xl font-semibold text-theme-text-primary">
				{children}
			</h2>
			<InkUnderline className="mt-1 w-32 text-theme-accent" />
		</div>
	);
}

function HouseRules({ pinNotes }: { pinNotes: boolean }) {
	const rules: { title: string; body: string; note: string }[] = [
		{
			title: "One job each",
			body: "None of this is a platform. Cephalote only looks at cryptography. Bagworm only opens a shell. Lacewing only handles tokens. A small tool is one you can actually finish, one you can read all of, and one you can drop when you stop needing it.",
			note: "scope creep is how good tools die.",
		},
		{
			title: "Safe by default, not by reminder",
			body: "A README that says \"remember to check the audience claim\" has already failed. If a mistake can be made impossible to write, that is where it gets handled: in the types, in the shape of the API, or at runtime. The docs are there to explain why, not to hold the railing up.",
			note: "if the docs are load-bearing, the api is wrong.",
		},
		{
			title: "Numbers you can check",
			body: "Every speed claim here comes from a harness that is public and runs on ordinary CI hardware. Cephalote-Bench exists because \"it's fast\" means nothing, and \"13,139 files in 2.1 seconds on a 4-vCPU runner, here is the workflow\" means something.",
			note: "benchmarks on a tuned dev machine are just bragging.",
		},
		{
			title: "Tooling decided once",
			body: "Three of these repos are empty templates: TypeScript, Python and native addons. Types, lint, changelogs, hooks and CI are set up before there is any code to put in them, because that is the part nobody wants to do again, and a standard you have to assemble by hand is one you will skip late at night.",
			note: "the boring parts, settled in advance.",
		},
	];
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{rules.map((r, i) => (
				<article
					key={r.title}
					data-note={r.note}
					className={
						"relative rounded-sm border border-theme-border bg-theme-panel/50 p-5 " +
						(i % 2 ? "rotate-[0.3deg]" : "-rotate-[0.3deg]")
					}
				>
					<span
						aria-hidden="true"
						className="absolute left-1/2 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-theme-accent/80 shadow-[0_1px_2px_rgb(0_0_0_/_0.35)]"
					/>
					<h3 className="font-display mb-2 mt-1 text-lg text-theme-text-primary">
						{r.title}
					</h3>
					<p className="text-sm leading-relaxed text-theme-text-secondary">
						{r.body}
					</p>
					{pinNotes && (
						<p className="font-hand mt-3 -rotate-1 rounded-sm border border-theme-accent/40 bg-theme-accent/5 px-3 py-1.5 text-sm text-theme-text-primary">
							{r.note}
						</p>
					)}
				</article>
			))}
		</div>
	);
}

function App() {
	const [open, setOpen] = useState<Specimen | null>(null);
	const [lensOn, setLensOn] = useState(false);
	const [gateOpen, setGateOpen] = useState(() => !hasBeenGreeted());
	const [theme, setTheme] = useState<Theme>(() => initializeTheme());
	const coarse = useCoarsePointer();

	// With a finger there is nothing to hover, so the lens pins every note
	// open in place instead of following a pointer that does not exist.
	const pinNotes = lensOn && coarse;

	const openSpecimen = useCallback((s: Specimen) => {
		setOpen(s);
	}, []);

	// Bagworm reacts to whichever card you opened, if that one has a line.
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
		<div className="min-h-screen bg-theme-bg text-theme-text antialiased">
			{/* No hero block. The case comes first and the wall label sits
			    under it, so the first thing on the page is the thing the page
			    is about, already moving. */}
			<div className="mx-auto max-w-4xl px-5 pt-6 sm:pt-8">
				<Vivarium onOpen={openSpecimen} />
			</div>
			<div className="mx-auto mt-6 max-w-4xl sm:px-5">
				<Plaque />
			</div>

			<main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
				<section
					className="mb-14"
					data-note="accession numbers run in the order things were made, not by importance."
					data-bagworm-line="drawers! open them! that's what they're for!"
				>
					<SectionHeading plate={1} id="cabinet">
						the cabinet
					</SectionHeading>
					<p className="mb-5 max-w-2xl text-theme-text-secondary">
						Everything we have, sorted by what it is rather than what it is
						written in. Pull a drawer open.
					</p>
					<Cabinet onOpen={openSpecimen} pinNotes={pinNotes} />
				</section>

				<section
					className="mb-14"
					data-note="written down so they can be argued with, not so they can be admired."
					data-bagworm-line="the boring-but-true bit."
				>
					<SectionHeading plate={2} id="rules">
						house rules
					</SectionHeading>
					<p className="mb-5 max-w-2xl text-theme-text-secondary">
						What the things in the cabinet have in common, and what to expect
						from whatever lands there next.
					</p>
					<HouseRules pinNotes={pinNotes} />
				</section>

				<section
					className="mb-14"
					data-note="no contact form. the issue tracker is the contact form."
					data-bagworm-line="the doors out. don't be a stranger."
				>
					<SectionHeading plate={3} id="elsewhere">
						elsewhere
					</SectionHeading>
					<p className="mb-5 max-w-2xl text-theme-text-secondary">
						It is all public. Issues and pull requests get read, and nothing
						here is too precious to argue about.
					</p>
					<div className="flex flex-wrap items-center gap-3">
						<a
							href={ORG_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex -rotate-1 items-center gap-2 rounded-sm border-2 border-theme-accent px-4 py-2 font-mono text-sm font-semibold uppercase tracking-wider text-theme-accent transition hover:bg-theme-accent/10"
						>
							the org on GitHub
						</a>
						<a
							href="https://www.npmjs.com/package/lacewing"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 rounded-sm border border-theme-border px-4 py-2 font-mono text-sm text-theme-text transition hover:bg-theme-border/30"
						>
							npm
						</a>
						<a
							href="https://smiduweorc.github.io/lacewing/"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 rounded-sm border border-theme-border px-4 py-2 font-mono text-sm text-theme-text transition hover:bg-theme-border/30"
						>
							lacewing docs
						</a>
					</div>
				</section>

				<footer
					data-note="he is called baggie. he lives here. please do not feed him."
					className="border-t border-theme-border/50 pt-6"
				>
					<InkSquiggle className="mb-3 text-theme-border" />
					<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
						<p className="font-mono text-xs leading-relaxed text-theme-comment">
							smiduweorc · <span className="italic">smiþ-weorc</span>, OE.
							smith-work.
						</p>
						<p className="font-hand -rotate-2 text-lg text-theme-text-secondary">
							kept by Baggie Da Bagworm
						</p>
					</div>
				</footer>
			</main>

			{gateOpen ? (
				<BagwormGate onDone={dismissGate} />
			) : (
				<BagwormParked sceneKey={open ? `card:${open.id}` : "collection"} />
			)}

			<SpecimenCard specimen={open} onClose={() => setOpen(null)} />
			<Lens active={lensOn && !coarse} onDismiss={() => setLensOn(false)} />

			{/* Tools, bottom-right, in the order you reach for them. */}
			<div className="lens-exempt fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
				<MagnifierToggle on={lensOn} onToggle={() => setLensOn((v) => !v)} />
				<SettingsButton currentTheme={theme} onThemeChange={setTheme} />
			</div>
		</div>
	);
}

export default App;
