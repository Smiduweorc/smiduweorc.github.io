// Run by `npm run build`, after the client and server bundles exist. Writes
// each page's HTML into dist/ so the site reads without JavaScript, and the
// sitemap beside it.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const DIST = "dist";
const HEAD_SLOT = "<!--seo-->";
const BODY_SLOT = "<div id=\"root\"></div>";

// The server bundle is build output with no declarations of its own. This is
// the part of src/entry-server.tsx the script uses.
type ServerEntry = {
	renderPages: () => { path: string; head: string; body: string }[];
	sitemap: (lastmod: string | null) => string;
	repoNames: () => string[];
};

const entry = (await import(
	pathToFileURL(join("dist-ssr", "entry-server.js")).href
)) as ServerEntry;

const template = readFileSync(join(DIST, "index.html"), "utf8");
for (const slot of [HEAD_SLOT, BODY_SLOT]) {
	if (!template.includes(slot)) {
		throw new Error(`prerender: ${DIST}/index.html has no ${slot} to fill`);
	}
}

const pages = entry.renderPages();
for (const page of pages) {
	const file = join(DIST, page.path, "index.html");
	mkdirSync(dirname(file), { recursive: true });
	// Function replacements: a "$&" in the page text is text, not a pattern.
	writeFileSync(
		file,
		template
			.replace(HEAD_SLOT, () => page.head)
			.replace(BODY_SLOT, () => `<div id="root">${page.body}</div>`),
	);
}

// GitHub Pages serves a project's docs from /<repo>/ on this domain, ahead of
// anything the site keeps at the same path. A repo named like one of the
// site's own top-level folders would take that folder over.
const repos = new Set(entry.repoNames());
const taken = readdirSync(DIST, { withFileTypes: true })
	.filter((e) => e.isDirectory() && repos.has(e.name.toLowerCase()))
	.map((e) => e.name);
if (taken.length) {
	throw new Error(
		`prerender: ${taken.map((n) => `${DIST}/${n}/`).join(", ")} shares a name with an org repo, whose docs would be served there instead. Rename the folder.`,
	);
}

function lastCommitDate(): string | null {
	try {
		return execFileSync("git", ["log", "-1", "--format=%cs"], { encoding: "utf8" }).trim() || null;
	} catch {
		// Built from a tarball, or git is not installed. The sitemap is valid
		// without dates, and a made-up one would be worse than none.
		return null;
	}
}

writeFileSync(join(DIST, "sitemap.xml"), entry.sitemap(lastCommitDate()));
console.log(`prerendered ${pages.length} pages`);
