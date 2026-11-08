// The hand lens reads the data-note margin notes under the pointer. With a
// finger there is no hover, so the toggle pins every note open instead.
// The lens hides the real cursor, so there is always a stated way out (Escape,
// or the button, which keeps its cursor).

import { useEffect, useRef, useState } from "react";

const LENS_SIZE = 148;
const NOTHING_HERE = "nothing pencilled in here.";

export function useCoarsePointer(): boolean {
	const [coarse, setCoarse] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(pointer: coarse)").matches,
	);
	useEffect(() => {
		const mq = window.matchMedia("(pointer: coarse)");
		const onChange = () => setCoarse(mq.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);
	return coarse;
}

export function MagnifierToggle({
	on,
	onToggle,
}: {
	on: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={on}
			title={
				on
					? "Put the hand lens away (Esc)"
					: "Hand lens: shows the notes in the margins"
			}
			className={
				"flex h-12 w-12 items-center justify-center rounded-full border text-lg shadow-lg backdrop-blur-sm transition " +
				(on
					? "border-theme-accent bg-theme-accent/20 text-theme-accent"
					: "border-theme-border bg-theme-panel/80 text-theme-text hover:bg-theme-panel")
			}
		>
			<svg
				className="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinecap="round"
				aria-hidden="true"
			>
				<circle cx="10.5" cy="10.5" r="6.5" />
				<path d="M15.4 15.4 L21 21" />
			</svg>
			<span className="sr-only">
				{on ? "Put the hand lens away" : "Pick up the hand lens"}
			</span>
		</button>
	);
}

export function Lens({
	active,
	onDismiss,
}: {
	active: boolean;
	onDismiss: () => void;
}) {
	const lensRef = useRef<HTMLDivElement>(null);
	const [note, setNote] = useState<string | null>(null);
	// Which side of the lens the note sits on, so it never runs off-screen.
	const [flip, setFlip] = useState(false);

	useEffect(() => {
		if (!active) {
			setNote(null);
			return;
		}
		document.body.classList.add("lens-active");

		// The real cursor is hidden while the lens is out, so Escape is the
		// reliable way back. Without it, putting the lens down means finding a
		// button you can no longer see yourself pointing at.
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onDismiss();
		};
		document.addEventListener("keydown", onKey);

		let raf = 0;
		let pending: { x: number; y: number } | null = null;

		const apply = () => {
			raf = 0;
			if (!pending) return;
			const { x, y } = pending;
			const el = lensRef.current;
			if (el) {
				el.style.transform = `translate3d(${x - LENS_SIZE / 2}px, ${
					y - LENS_SIZE / 2
				}px, 0)`;
			}
			// What is under the glass? elementFromPoint ignores the lens itself
			// because the lens is pointer-events: none.
			const under = document.elementFromPoint(x, y);
			const carrier = under?.closest<HTMLElement>("[data-note]");
			setNote(carrier?.dataset.note ?? null);
			setFlip(x > window.innerWidth - 320);
		};

		const onMove = (e: PointerEvent) => {
			if (e.pointerType === "touch") return;
			pending = { x: e.clientX, y: e.clientY };
			if (!raf) raf = requestAnimationFrame(apply);
		};

		document.addEventListener("pointermove", onMove, { passive: true });
		return () => {
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("keydown", onKey);
			if (raf) cancelAnimationFrame(raf);
			document.body.classList.remove("lens-active");
		};
	}, [active, onDismiss]);

	if (!active) return null;

	return (
		<>
			{/* Hidden cursor needs a stated way out. */}
			<div
				role="status"
				className="pointer-events-none fixed inset-x-0 top-4 z-[56] flex justify-center px-4"
			>
				<p className="rounded-full border border-theme-accent/50 bg-theme-bg/90 px-4 py-1.5 font-mono text-xs text-theme-text-primary shadow-lg backdrop-blur-sm">
					hand lens out. move it over the page.{" "}
					<span className="text-theme-comment">esc to put it down</span>
				</p>
			</div>

			<div
				ref={lensRef}
				aria-hidden="true"
				className="pointer-events-none fixed left-0 top-0 z-[55]"
				style={{ width: LENS_SIZE, height: LENS_SIZE }}
			>
				<div className="lens-glass h-full w-full rounded-full border-[3px] border-theme-accent/80 shadow-[0_6px_24px_rgb(0_0_0_/_0.45)]" />
				<div
					className="absolute h-[46px] w-[9px] rounded-full bg-theme-accent/80"
					style={{
						left: LENS_SIZE - 22,
						top: LENS_SIZE - 22,
						transform: "rotate(-45deg)",
						transformOrigin: "top center",
					}}
				/>
				<div
					className={
						"absolute top-1/2 w-56 -translate-y-1/2 " +
						(flip ? "right-full mr-3" : "left-full ml-3")
					}
				>
					<p
						className={
							"font-hand -rotate-1 rounded-sm border px-3 py-2 text-sm leading-snug shadow-xl " +
							(note
								? "border-theme-accent/40 bg-theme-bg/95 text-theme-text-primary"
								: "border-theme-border/50 bg-theme-bg/80 text-theme-comment")
						}
					>
						{note ?? NOTHING_HERE}
					</p>
				</div>
			</div>
		</>
	);
}
