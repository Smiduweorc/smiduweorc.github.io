// The specimen cabinet: one drawer per kind of thing the org makes.
//
// Drawers open on click and animate with the grid-template-rows 0fr→1fr
// trick, which gets a real height transition without anyone measuring
// scrollHeight by hand. Several drawers can be open at once, because this is a
// cabinet you rummage in, not an accordion that tidies up after you.

import { useState } from "react";
import { Plate } from "./vivarium/artwork";
import { PinnedNote } from "./Magnifier";
import {
	KIND_META,
	KIND_ORDER,
	accession,
	byKind,
	type Kind,
	type Specimen,
} from "./specimens";

export function Cabinet({
	onOpen,
	pinNotes,
}: {
	onOpen: (s: Specimen) => void;
	pinNotes: boolean;
}) {
	// The libraries drawer starts open, so the section never reads as an
	// empty wall of closed boxes on first paint.
	const [open, setOpen] = useState<Set<Kind>>(() => new Set<Kind>(["library"]));

	const toggle = (kind: Kind) =>
		setOpen((prev) => {
			const next = new Set(prev);
			if (next.has(kind)) next.delete(kind);
			else next.add(kind);
			return next;
		});

	return (
		<div className="space-y-3">
			{KIND_ORDER.map((kind) => (
				<Drawer
					key={kind}
					kind={kind}
					isOpen={open.has(kind)}
					onToggle={() => toggle(kind)}
					onOpen={onOpen}
					pinNotes={pinNotes}
				/>
			))}
		</div>
	);
}

function Drawer({
	kind,
	isOpen,
	onToggle,
	onOpen,
	pinNotes,
}: {
	kind: Kind;
	isOpen: boolean;
	onToggle: () => void;
	onOpen: (s: Specimen) => void;
	pinNotes: boolean;
}) {
	const meta = KIND_META[kind];
	const items = byKind(kind);
	const panelId = `drawer-${kind}`;
	// Drawer headers carry a note too, so the lens finds something whether or
	// not the drawer under it happens to be open.
	const drawerNote: Record<Kind, string> = {
		library: "you import these. they run inside your process.",
		instrument: "you run these at your code. they don't ship with it.",
		cast: "start here, then delete the bits you don't want.",
		colony: "you run this one. other people are the ones using it.",
	};

	return (
		<section
			className={
				"overflow-hidden rounded-md border border-theme-border bg-theme-panel/40 transition-colors " +
				(isOpen ? "border-theme-accent/40" : "hover:border-theme-border")
			}
		>
			<h3 data-note={drawerNote[kind]}>
				<button
					type="button"
					onClick={onToggle}
					aria-expanded={isOpen}
					aria-controls={panelId}
					className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-theme-border/20"
				>
					{/* the drawer pull */}
					<span
						aria-hidden="true"
						className={
							"h-1.5 w-9 shrink-0 rounded-full transition " +
							(isOpen
								? "bg-theme-accent"
								: "bg-theme-border group-hover:bg-theme-accent/60")
						}
					/>
					<span className="min-w-0 flex-1">
						<span className="font-display text-lg text-theme-text-primary">
							{meta.title}
						</span>
						<span className="ml-2 font-mono text-xs text-theme-comment">
							{items.length} {items.length === 1 ? "specimen" : "specimens"}
						</span>
						<span className="mt-0.5 block text-sm leading-snug text-theme-text-secondary">
							{meta.blurb}
						</span>
					</span>
					<span
						aria-hidden="true"
						className={
							"shrink-0 font-mono text-xs text-theme-comment transition-transform duration-300 " +
							(isOpen ? "rotate-90" : "")
						}
					>
						▶
					</span>
				</button>
			</h3>

			<div
				id={panelId}
				className={
					"grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none " +
					(isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
				}
			>
				<div className="overflow-hidden">
					{/* the drawer's inner lip, so open reads as depth */}
					<div className="border-t border-theme-border/70 bg-theme-bg/40 px-3 py-3">
						<ul className="space-y-2">
							{items.map((s) => (
								<li key={s.id}>
									<SpecimenRow
										specimen={s}
										onOpen={onOpen}
										pinNotes={pinNotes}
										tabbable={isOpen}
									/>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}

function SpecimenRow({
	specimen,
	onOpen,
	pinNotes,
	tabbable,
}: {
	specimen: Specimen;
	onOpen: (s: Specimen) => void;
	pinNotes: boolean;
	tabbable: boolean;
}) {
	return (
		<div data-note={specimen.note}>
			<button
				type="button"
				onClick={() => onOpen(specimen)}
				// A closed drawer is visually gone but still in the DOM, so its
				// contents must leave the tab order too.
				tabIndex={tabbable ? 0 : -1}
				aria-hidden={!tabbable}
				className="group flex w-full items-start gap-3 rounded-sm border border-transparent px-2 py-2 text-left transition hover:border-theme-border hover:bg-theme-panel/70 focus:outline-none focus-visible:border-theme-accent"
			>
				<span className="mt-0.5 flex h-9 w-14 shrink-0 items-center justify-center text-theme-comment transition-colors group-hover:text-theme-accent">
					<Plate artwork={specimen.art} className="h-full w-full" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="flex flex-wrap items-baseline gap-x-2">
						<span className="font-semibold text-theme-text-primary transition-colors group-hover:text-theme-accent">
							{specimen.name}
						</span>
						<span className="font-mono text-[0.6875rem] italic text-theme-comment">
							{specimen.binomial}
						</span>
					</span>
					<span className="mt-0.5 block text-sm leading-snug text-theme-text-secondary">
						{specimen.tagline}
					</span>
				</span>
				<span className="shrink-0 font-mono text-[0.6875rem] text-theme-comment">
					{accession(specimen)}
				</span>
			</button>
			<div className="px-2">
				<PinnedNote note={specimen.note} on={pinNotes} />
			</div>
		</div>
	);
}
