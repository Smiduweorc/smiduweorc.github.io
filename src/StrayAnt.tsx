// One of the ants got out. It is Mycocepurus because that is the smallest
// drawing in the collection, and an escaped ant should be small.
// The walk and the step are keyframes in index.css. Catch it and it stops
// for a moment while Bagworm comes over to say so, then carries on.

import { useRef, useState } from "react";
import { bagwormQuip } from "./bagworm/Bagworm";
import { Plate } from "./vivarium/artwork";

const HELD_MS = 2600;

export function StrayAnt() {
	const [held, setHeld] = useState(false);
	const ref = useRef<HTMLButtonElement>(null);
	const paused = { animationPlayState: held ? "paused" : undefined };
	return (
		<div
			aria-hidden="true"
			// A size container, so the keyframes can measure the walk in cqw:
			// the page's own width, not the viewport's.
			className="pointer-events-none absolute inset-x-0 top-0 h-0 [container-type:inline-size] motion-reduce:hidden"
		>
			<div className="stray-ant absolute bottom-0 left-0 text-theme-text-secondary" style={paused}>
				{/* Out of the tab order: a moving target, and the same ant is
				    in the collection for anyone not chasing it. */}
				<button
					ref={ref}
					type="button"
					tabIndex={-1}
					onClick={() => {
						if (held) return;
						setHeld(true);
						bagwormQuip(ref.current, "you caught one! it's a clone, so nobody will miss it.");
						window.setTimeout(() => setHeld(false), HELD_MS);
					}}
					className="pointer-events-auto -m-2 block cursor-pointer p-2"
				>
					<span className="block" style={paused}>
						<Plate artwork="mycocepurus" className="h-4 w-9" />
					</span>
				</button>
			</div>
		</div>
	);
}
