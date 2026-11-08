// One of the ants got out. It is Mycocepurus because that is the smallest
// drawing in the collection, and an escaped ant should be small.
// Pure CSS: the walk and the step are keyframes in index.css.

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
