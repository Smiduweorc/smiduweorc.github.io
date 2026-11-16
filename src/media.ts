import { useCallback, useSyncExternalStore } from "react";

/** False in the prerendered HTML and while it hydrates, then the real answer:
 *  the build cannot know the visitor's screen, and a first render that
 *  guessed differently from the HTML would not hydrate. */
export function useMediaQuery(query: string): boolean {
	const subscribe = useCallback(
		(onChange: () => void) => {
			const mq = window.matchMedia(query);
			mq.addEventListener("change", onChange);
			return () => mq.removeEventListener("change", onChange);
		},
		[query],
	);
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(query).matches,
		() => false,
	);
}

/** True on touch devices: no cursor, so no hover and nothing to follow. */
export const useCoarsePointer = (): boolean => useMediaQuery("(pointer: coarse)");

export const usePrefersReducedMotion = (): boolean =>
	useMediaQuery("(prefers-reduced-motion: reduce)");
