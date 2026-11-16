// What a search engine or a link preview reads about each page. The same
// titles are set on the live page as cards open and close.

import { specimenPath } from "./route";
import { SPECIMENS, type Kind, type Specimen } from "./specimens";

export const SITE = "https://smiduweorc.github.io";
const ORG_NAME = "Smiduweorc";
const ORG_URL = "https://github.com/Smiduweorc";
// A capture of the tank, 1200x630. Link previews want one fixed image, and
// the tank is the only picture of the whole collection there is.
const PREVIEW_IMAGE = `${SITE}/preview.png`;

const KIND_NOUN: Record<Kind, string> = {
	library: "library",
	instrument: "command line tool",
	cast: "project template",
	colony: "self-hosted application",
};

export type PageMeta = {
	path: string;
	title: string;
	description: string;
	/** schema.org objects, one script tag each. */
	jsonLd: Record<string, unknown>[];
};

const ORGANIZATION = {
	"@type": "Organization",
	"@id": `${SITE}/#org`,
	name: ORG_NAME,
	url: `${SITE}/`,
	sameAs: [ORG_URL],
};

function homeMeta(): PageMeta {
	return {
		path: "/",
		title: "Smiduweorc | Half code, Half Insect Documentary.",
		description:
			"Smiduweorc: half code, half insect documentary. Lacewing (a strict JWT library for TypeScript), Cephalote, Bagworm and more, each named after an insect.",
		jsonLd: [
			{ "@context": "https://schema.org", ...ORGANIZATION },
			{
				"@context": "https://schema.org",
				"@type": "WebSite",
				name: ORG_NAME,
				url: `${SITE}/`,
				publisher: { "@id": ORGANIZATION["@id"] },
			},
		],
	};
}

function specimenMeta(s: Specimen): PageMeta {
	const path = specimenPath(s);
	const repo = s.links.find((l) => l.label === "GitHub")?.href;
	return {
		path,
		title: `${s.name}: ${s.tagline.replace(/\.$/, "")} | ${ORG_NAME}`,
		description: `${s.name} is a ${KIND_NOUN[s.kind]} from ${ORG_NAME}. ${s.tagline} Tags: ${s.tags.join(", ")}.`,
		jsonLd: [
			{
				"@context": "https://schema.org",
				"@type": "SoftwareSourceCode",
				name: s.name,
				description: s.description,
				url: SITE + path,
				codeRepository: repo,
				keywords: s.tags.join(", "),
				author: ORGANIZATION,
			},
			{
				"@context": "https://schema.org",
				"@type": "BreadcrumbList",
				itemListElement: [
					{ "@type": "ListItem", position: 1, name: ORG_NAME, item: `${SITE}/` },
					{ "@type": "ListItem", position: 2, name: s.name, item: SITE + path },
				],
			},
		],
	};
}

export const pageMeta = (s: Specimen | null): PageMeta =>
	s ? specimenMeta(s) : homeMeta();

export const allPages = (): PageMeta[] => [
	homeMeta(),
	...SPECIMENS.map(specimenMeta),
];

const escapeHtml = (text: string): string =>
	text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;");

/** The tags that differ per page, as HTML for the document head. */
export function headTags(meta: PageMeta): string {
	const url = SITE + meta.path;
	const title = escapeHtml(meta.title);
	const description = escapeHtml(meta.description);
	return [
		`<title>${title}</title>`,
		`<meta name="description" content="${description}" />`,
		`<link rel="canonical" href="${url}" />`,
		`<meta property="og:site_name" content="${ORG_NAME}" />`,
		"<meta property=\"og:type\" content=\"website\" />",
		`<meta property="og:url" content="${url}" />`,
		`<meta property="og:title" content="${title}" />`,
		`<meta property="og:description" content="${description}" />`,
		`<meta property="og:image" content="${PREVIEW_IMAGE}" />`,
		"<meta property=\"og:image:width\" content=\"1200\" />",
		"<meta property=\"og:image:height\" content=\"630\" />",
		"<meta name=\"twitter:card\" content=\"summary_large_image\" />",
		...meta.jsonLd.map(
			(o) =>
				// "<" escaped so no string in the data can close the script tag.
				`<script type="application/ld+json">${JSON.stringify(o).replaceAll("<", "\\u003c")}</script>`,
		),
	].join("\n\t");
}

/** The docs sites the projects publish on this domain, for the sitemap. */
const docsSites = (): string[] =>
	SPECIMENS.flatMap((s) => s.links)
		.filter((l) => l.label === "Docs" && l.href.startsWith(`${SITE}/`))
		.map((l) => l.href);

/** `lastmod` is the date the site's source last changed, or left out when
 *  the build cannot tell. The docs sites are built elsewhere, so they never
 *  get one. */
export function sitemap(lastmod: string | null): string {
	const stamp = lastmod ? `\n\t\t<lastmod>${lastmod}</lastmod>` : "";
	const own = allPages().map(
		(p) => `\t<url>\n\t\t<loc>${SITE}${p.path}</loc>${stamp}\n\t</url>`,
	);
	const docs = docsSites().map((href) => `\t<url>\n\t\t<loc>${href}</loc>\n\t</url>`);
	return [
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
		"<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
		...own,
		...docs,
		"</urlset>",
		"",
	].join("\n");
}

/** Every repo name in the org, lowercased: the top-level paths GitHub Pages
 *  may hand to a project's docs. */
export const repoNames = (): string[] =>
	SPECIMENS.flatMap((s) => s.links)
		.map((l) => /^https:\/\/github\.com\/Smiduweorc\/([^/]+)/.exec(l.href)?.[1])
		.filter((name): name is string => !!name)
		.map((name) => name.toLowerCase());
