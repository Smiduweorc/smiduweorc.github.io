// Whether Bagworm has already done the door greeting for this visitor.
// Once per browser, not once per page load. Being greeted by name every
// single visit stops being charming somewhere around the third time.

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
		// nothing to do; the gate simply reappears next visit
	}
}
