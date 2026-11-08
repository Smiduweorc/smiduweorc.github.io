// Whether Bagworm has greeted this visitor. Once per browser, not per page load.

const GREETED_KEY = "smiduweorc-greeted";

export function hasBeenGreeted(): boolean {
	if (typeof window === "undefined") return true;
	try {
		return localStorage.getItem(GREETED_KEY) === "1";
	} catch {
		// Private mode or storage disabled. Treat as greeted: an overlay that
		// cannot be dismissed permanently is worse than one nobody sees.
		return true;
	}
}

export function markGreeted(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(GREETED_KEY, "1");
	} catch {
		// nothing to do; the gate reappears next visit
	}
}
