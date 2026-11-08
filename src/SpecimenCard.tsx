import { useEffect, useRef, useState } from "react";
import { Plate } from "./vivarium/artwork";
import {
	KIND_META,
	type Reading,
	type Specimen,
} from "./specimens";
import { NpmCount } from "./NpmCount";

// On a phone the full pitch is a wall of text above the facts most people
// open the card for, so it is folded to a preview of about this many letters.
const PREVIEW_CHARS = 220;

function useNarrow(): boolean {
	const query = "(max-width: 639px)";
	const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
	useEffect(() => {
		const mq = window.matchMedia(query);
		const onChange = () => setNarrow(mq.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);
	return narrow;
}

/** Cut at a word boundary, never mid-word. */
function Description({ text }: { text: string }) {
	const narrow = useNarrow();
	const [open, setOpen] = useState(false);
	const foldable = narrow && text.length > PREVIEW_CHARS;
	const shown =
		foldable && !open
			? text.slice(0, text.lastIndexOf(" ", PREVIEW_CHARS)).replace(/[\s,;:.]+$/, "") + "..."
			: text;
	return (
		<div className="mb-4">
			<p className="leading-7 text-theme-text">{shown}</p>
			{foldable && (
				<button
					type="button"
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
					className="font-hand mt-1 py-2 text-theme-accent underline decoration-theme-accent/40 underline-offset-4"
				>
					{open ? "fold it back up" : "read the rest"}
				</button>
			)}
		</div>
	);
}

export function SpecimenCard({
	specimen,
	reading,
	onClose,
}: {
	specimen: Specimen | null;
	reading: Reading;
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
	const guide = reading === "guide";
	const rows: [string, string][] = [
		[guide ? "order" : "language", specimen.taxonomy.order],
		[guide ? "habitat" : "runs in", specimen.taxonomy.habitat],
		[guide ? "diet" : "handles", specimen.taxonomy.diet],
		[guide ? "stage" : "status", specimen.taxonomy.stage],
		[guide ? "first described" : "started", specimen.taxonomy.described],
	];

	return (
		// Centre inside a min-h-full wrapper, not on the scroll container: on a short
		// window that pins the title out of reach.
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="specimen-card-title"
			className="fixed inset-0 z-[70] overflow-y-auto"
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
					<span
						aria-hidden="true"
						className="absolute left-1/2 top-2.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-theme-comment shadow-[0_2px_4px_rgb(0_0_0_/_0.5)]"
					/>

					<div className="flex items-start justify-between gap-4 border-b border-theme-border px-5 pb-3 pt-7 sm:px-7">
						<div className="min-w-0">
							<p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-theme-comment">
								{meta.title}
							</p>
							<h2
								id="specimen-card-title"
								className="font-display text-3xl leading-tight text-theme-text-primary"
							>
								{specimen.name}
							</h2>
							{guide && (
								<p className="font-mono text-sm italic text-theme-text-secondary">
									{specimen.binomial}
								</p>
							)}
						</div>
						<button
							ref={closeRef}
							type="button"
							onClick={onClose}
							className="shrink-0 rounded-sm border border-theme-border px-2.5 py-1 text-sm text-theme-text transition hover:border-theme-accent/70 hover:bg-theme-accent/10 hover:text-theme-accent"
						>
						close
						</button>
					</div>

					<div className="grid gap-5 px-5 py-5 sm:grid-cols-[9rem_1fr] sm:px-7 sm:py-6">
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
							{/* keyed so a different card starts folded again */}
							<Description key={specimen.id} text={specimen.description} />

							<dl className="index-card-lines mb-4 rounded-sm border border-theme-border/70 bg-theme-bg/30 px-3 pb-1">
								{rows.map(([label, value]) => (
									<div
										key={label}
										// Must match the 28px rule pitch in .index-card-lines, which starts at the list's top edge.
										className="flex flex-col py-1.5 text-sm sm:flex-row sm:items-baseline sm:gap-3 sm:py-0 sm:leading-7"
									>
										<dt className="text-xs text-theme-comment sm:w-[7.5rem] sm:shrink-0 sm:text-sm sm:leading-7">
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
								<NpmCount specimen={specimen} className="text-theme-comment" />
							</div>

							<p className="font-mono text-xs leading-relaxed text-theme-comment">
							tags: {specimen.tags.join(", ")}
							</p>
						</div>
					</div>

					{guide && (
						<p className="font-hand border-t border-theme-border/60 px-5 py-3 text-sm text-theme-text-secondary sm:px-7">
							<span className="text-theme-comment">note: </span>
							{specimen.note}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
