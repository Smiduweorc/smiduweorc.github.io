// One of the ants has got out. Every so often it walks along the top edge of
// the journal and off the other side. It is Mycocepurus because that one is
// the smallest drawing in the collection and an escaped ant should be small.
//
// Pure CSS: the walk across and the step are both keyframes in index.css, so
// it costs nothing between crossings. Under reduced motion it stays in.

import { Plate } from "./vivarium/artwork";

export function StrayAnt() {
	return (
		<div
			aria-hidden="true"
			// A size container, so the keyframes can measure the walk in cqw:
			// the page's own width, not the viewport's.
			className="pointer-events-none absolute inset-x-0 top-0 h-0 [container-type:inline-size] motion-reduce:hidden"
		>
			<div className="stray-ant absolute bottom-0 left-0 text-theme-text-secondary">
				<span className="block">
					<Plate artwork="mycocepurus" className="h-4 w-9" />
				</span>
			</div>
		</div>
	);
}
