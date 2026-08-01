// The field-guide card: one specimen, plated and labelled.
//
// Laid out like a museum label, with the plate on the left and the taxonomy
// table on the right, rather than as the tidy centred modal every project
// site uses.

import { useEffect, useRef } from "react";
import { Plate } from "./vivarium/artwork";
import { accession, KIND_META, type Specimen } from "./specimens";

export function SpecimenCard({
	specimen,
	onClose,
}: {
	specimen: Specimen | null;
	onClose: () => void;
}) {
	const closeRef = useRef<HTMLButtonElement>(null);
	// Whatever opened the card gets the focus back when it closes, so a
	// keyboard visitor is not dumped at the top of the document.
	const returnTo = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!specimen) return;
		returnTo.current = document.activeElement as HTMLElement | null;
		closeRef.current?.focus();

		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);

		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
			returnTo.current?.focus?.();
		};
	}, [specimen, onClose]);

	if (!specimen) return null;

	const meta = KIND_META[specimen.kind];
	const rows: [string, string][] = [
		["order", specimen.taxonomy.order],
		["habitat", specimen.taxonomy.habitat],
		["diet", specimen.taxonomy.diet],
		["stage", specimen.taxonomy.stage],
		["first described", specimen.taxonomy.described],
	];

	return (
		// The scroll container is the backdrop, and the card is centred by a
		// min-h-full flex wrapper inside it. Centring the card directly on the
		// overflow container instead pins its top out of reach on a short
		// window, and the first thing you cannot scroll to is the title.
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="specimen-card-title"
			className="fixed inset-0 z-50 overflow-y-auto"
		>
			<button
				type="button"
				tabIndex={-1}
				aria-label="Close"
				onClick={onClose}
				className="fixed inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
			/>

			<div className="flex min-h-full items-center justify-center p-4 sm:p-6">
				<div className="relative z-10 w-full max-w-2xl -rotate-[0.4deg] rounded-sm border-2 border-theme-border bg-theme-panel shadow-2xl">
					{/* the pin holding the card to the board */}
					<span
						aria-hidden="true"
						className="absolute left-1/2 top-2.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-theme-accent shadow-[0_2px_4px_rgb(0_0_0_/_0.5)]"
					/>

					<div className="flex items-start justify-between gap-4 border-b border-theme-border px-5 pb-3 pt-7 sm:px-7">
						<div className="min-w-0">
							<p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-theme-comment">
								{accession(specimen)} · {meta.title}
							</p>
							<h2
								id="specimen-card-title"
								className="font-display text-3xl leading-tight text-theme-text-primary"
							>
								{specimen.name}
							</h2>
							<p className="font-mono text-sm italic text-theme-text-secondary">
								{specimen.binomial}
							</p>
						</div>
						<button
							ref={closeRef}
							type="button"
							onClick={onClose}
							className="shrink-0 rounded-sm border border-theme-border px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-theme-text transition hover:border-theme-accent/70 hover:bg-theme-accent/10 hover:text-theme-accent"
						>
						close
						</button>
					</div>

					<div className="grid gap-5 px-5 py-5 sm:grid-cols-[9rem_1fr] sm:px-7 sm:py-6">
						{/* the plate */}
						<div className="flex flex-col items-center gap-2">
							<div className="flex h-28 w-full items-center justify-center rounded-sm border border-theme-border bg-theme-bg/60 p-2 text-theme-text-secondary">
								<Plate artwork={specimen.art} className="h-full w-full" />
							</div>
							<p className="stamp">{specimen.taxonomy.stage}</p>
						</div>

						<div className="min-w-0">
							<p className="font-hand mb-3 text-base leading-snug text-theme-text-primary">
								{specimen.tagline}
							</p>
							<p className="mb-4 leading-7 text-theme-text">
								{specimen.description}
							</p>

							<dl className="index-card-lines mb-4 rounded-sm border border-theme-border/70 bg-theme-bg/30 px-3 py-2">
								{rows.map(([label, value]) => (
									<div
										key={label}
										// Row height must equal the rule pitch in
										// .index-card-lines (28px) or the text drifts
										// off the ruling a little more with each row.
										className="flex gap-3 text-sm leading-7"
									>
										<dt className="w-[7.5rem] shrink-0 font-mono text-xs uppercase tracking-wider text-theme-comment">
											{label}
										</dt>
										<dd className="min-w-0 flex-1 text-theme-text">{value}</dd>
									</div>
								))}
							</dl>

							<div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-sm">
								{specimen.links.map((l) => (
									<a
										key={l.href}
										href={l.href}
										target="_blank"
										rel="noopener noreferrer"
										className="text-theme-accent underline decoration-theme-accent/40 underline-offset-2 transition hover:decoration-theme-accent"
									>
										{l.label.toLowerCase()} ↗
									</a>
								))}
							</div>

							<p className="font-mono text-xs leading-relaxed text-theme-comment">
							tags: {specimen.tags.join(" · ")}
							</p>
						</div>
					</div>

					{/* the collector's note, in pencil along the bottom edge */}
					<p className="font-hand border-t border-theme-border/60 px-5 py-3 text-sm text-theme-text-secondary sm:px-7">
						<span className="text-theme-comment">note: </span>
						{specimen.note}
					</p>
				</div>
			</div>
		</div>
	);
}
