import type { ComponentProps } from "react";
import { specimenPath } from "./route";
import type { Specimen } from "./specimens";

/** A real link to the specimen's own page, so a crawler can follow it and a
 *  new tab gets the right address. A plain click opens the card in place. */
export function SpecimenLink({
	specimen,
	onOpen,
	...rest
}: {
	specimen: Specimen;
	onOpen: (s: Specimen) => void;
} & Omit<ComponentProps<"a">, "href" | "onClick">) {
	return (
		<a
			{...rest}
			href={specimenPath(specimen)}
			onClick={(e) => {
				// Anything but a plain left click is asking for a new tab or
				// window, which the browser does better than we would.
				if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();
				onOpen(specimen);
			}}
		/>
	);
}
