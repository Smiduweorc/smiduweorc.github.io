// Every specimen has a page of its own under /field-guide/. Project docs are
// published at /<repo>/ on this same domain, so nothing of the site's lives at
// the top level under a name a repo could take. scripts/prerender.ts fails the
// build if one ever does.

import { byId, type Specimen } from "./specimens";

export const FIELD_GUIDE = "field-guide";

export const specimenPath = (s: Specimen): string => `/${FIELD_GUIDE}/${s.id}/`;

const SPECIMEN_PATH = new RegExp(`^/${FIELD_GUIDE}/([^/]+)/?$`);

/** The specimen a path belongs to, or null for the home page and anything
 *  unknown. */
export function specimenAt(pathname: string): Specimen | null {
	const id = SPECIMEN_PATH.exec(pathname)?.[1];
	return (id && byId(id)) || null;
}
