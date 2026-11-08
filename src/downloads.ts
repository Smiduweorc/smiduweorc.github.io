// Weekly npm downloads, fetched once per page load in one bulk request.
// A failed request shows nothing: a missing count beats a made-up one.

import { useEffect, useState } from "react";
import { SPECIMENS, type Specimen } from "./specimens";

const NPM_PACKAGE = /^https:\/\/www\.npmjs\.com\/package\/(.+)$/;

export function npmPackage(s: Specimen): string | null {
	for (const l of s.links) {
		const m = NPM_PACKAGE.exec(l.href);
		if (m) return m[1];
	}
	return null;
}

type Counts = Record<string, number>;

let request: Promise<Counts> | null = null;

function fetchCounts(): Promise<Counts> {
	if (request) return request;
	const names = SPECIMENS.map(npmPackage).filter((n): n is string => !!n);
	if (!names.length) return (request = Promise.resolve({}));
	// The bulk endpoint takes unscoped names only; none of ours are scoped.
	request = fetch(`https://api.npmjs.org/downloads/point/last-week/${names.join(",")}`)
		.then((r) => (r.ok ? r.json() : {}))
		.then((body: Record<string, { downloads?: number } | null>) => {
			const out: Counts = {};
			for (const [name, v] of Object.entries(body)) {
				if (typeof v?.downloads === "number") out[name] = v.downloads;
			}
			return out;
		})
		.catch(() => ({}));
	return request;
}

export function useWeeklyDownloads(s: Specimen | null): number | null {
	const [counts, setCounts] = useState<Counts | null>(null);
	useEffect(() => {
		let live = true;
		fetchCounts().then((c) => live && setCounts(c));
		return () => {
			live = false;
		};
	}, []);
	const name = s && npmPackage(s);
	return name && counts ? (counts[name] ?? null) : null;
}

const compact = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

/** "41.4k/wk": short enough for a catalogue line. */
export function formatWeekly(n: number): string {
	return `${compact.format(n).toLowerCase()}/wk`;
}
