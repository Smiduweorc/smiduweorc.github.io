// The collection. One entry per repository in the Smiduweorc org, written up
// the way a field guide writes up an animal.
//
// Everything here is real. Descriptions and numbers come from the repos. The
// taxonomy is the joke: `order` is the language, `habitat` is where the thing
// runs, `diet` is what it eats. `stage` is the one field a visitor actually
// needs, so it stays honest and short.

import type { ArtworkKey } from "./vivarium/artwork";

export type Kind = "library" | "instrument" | "cast";

export type Specimen = {
	id: string;
	/** Display name, as the repo spells it. */
	name: string;
	/** The mock-latin binomial on the field-guide card. */
	binomial: string;
	kind: Kind;
	art: ArtworkKey;
	/** One line, for the tank label and the drawer row. */
	tagline: string;
	/** The pitch, in the project's own terms. */
	description: string;
	taxonomy: {
		order: string;
		habitat: string;
		diet: string;
		/** Kept to a word or two: it doubles as the stamp on the card. */
		stage: string;
		described: string;
	};
	tags: string[];
	links: { label: string; href: string }[];
	/** Margin note, only legible under the hand lens. Keep them short. */
	note: string;
	/** Flagships get a slot in the vivarium; the rest live in the cabinet. */
	inTank?: boolean;
	/** Bagworm's reaction when you open this card. */
	quip?: string;
};

export const KIND_META: Record<Kind, { title: string; blurb: string }> = {
	library: {
		title: "Specimens",
		blurb: "Libraries. Things you import into your own project.",
	},
	instrument: {
		title: "Instruments",
		blurb: "Command line tools. Things you run at your code.",
	},
	cast: {
		title: "Casts",
		blurb:
			"Templates. Empty project skeletons with the tooling already set up.",
	},
};

export const KIND_ORDER: Kind[] = ["library", "instrument", "cast"];

const GH = "https://github.com/Smiduweorc";

export const SPECIMENS: Specimen[] = [
	{
		id: "lacewing",
		name: "Lacewing",
		binomial: "Chrysoperla tokenifera",
		kind: "library",
		art: "lacewing",
		inTank: true,
		tagline: "A JWT library that won't let you make the usual JWT mistakes.",
		description:
			"You define a verification profile once, and it makes you fill in the issuer, audience, algorithm list and key source. Every verify call then goes through it. There is no low-level mode to get wrong. On top of that you get remote JWKS with caching and rotation, token revocation, secure cookie helpers, and encrypted tokens. What RFC 8725 says you must do is checked by the types or at runtime, instead of sitting in the docs as advice.",
		taxonomy: {
			order: "TypeScript, ESM only, Node 24+",
			habitat: "anything that hands out or checks tokens",
			diet: "forged tokens and \"alg\": \"none\"",
			stage: "released",
			described: "July 2026",
		},
		tags: ["JWT", "JWE", "RFC 8725", "jose", "security", "TypeScript"],
		links: [
			{ label: "GitHub", href: `${GH}/lacewing` },
			{ label: "npm", href: "https://www.npmjs.com/package/lacewing" },
			{ label: "Docs", href: "https://Smiduweorc.github.io/lacewing/" },
		],
		note: "eats mosquitoes. and your bad auth code.",
		quip: "very strict. very fair. never lets the fakes in.",
	},
	{
		id: "cephalote",
		name: "Cephalote",
		binomial: "Cephalotes cryptovorans",
		kind: "instrument",
		art: "cephalote",
		inTank: true,
		tagline: "Finds the weak crypto in your code and tells you where it is.",
		description:
			"Cephalote reads a source tree and reports broken or ageing cryptography: MD5, SHA-1, DES, RC4, undersized RSA keys, keys pasted straight into the source. It is one static binary with nothing to install, so it drops into CI or onto a server as is. Output can be text, JSON or SARIF, and --exit-code fails the build when it finds something. Go gets a real AST; everything else goes through Tree-sitter.",
		taxonomy: {
			order: "Go, single static binary",
			habitat: "CI pipelines and pre-commit hooks",
			diet: "MD5, SHA-1, DES, RC4, 1024-bit RSA",
			stage: "released",
			described: "June 2026",
		},
		tags: ["Go", "static analysis", "cryptography", "SARIF", "Tree-sitter"],
		links: [
			{ label: "GitHub", href: `${GH}/Cephalote` },
			{ label: "Releases", href: `${GH}/Cephalote/releases` },
		],
		note: "turtle ants plug the nest door with their own heads. so does this.",
		quip: "reads your code and tuts disapprovingly.",
	},
	{
		id: "bagworm",
		name: "Bagworm",
		binomial: "Psyche portabilis",
		kind: "instrument",
		art: "bagworm",
		inTank: true,
		tagline: "Carries your dev shell into a container on any runtime.",
		description:
			"Put a bagworm.yaml in your project with one line saying which image you want, then run bagworm enter from anywhere in the tree. You get a shell in that container. Files you create inside belong to you on the host, and the container is thrown away when you leave. It behaves the same on Docker, nerdctl and podman, which is the whole reason it exists. A typo in the config is a real error that names the key and the line, not a silent shrug.",
		taxonomy: {
			order: "Go",
			habitat: "docker, nerdctl and podman",
			diet: "the four workspace configs you'd otherwise keep in sync",
			stage: "released",
			described: "July 2026",
		},
		tags: ["Go", "OCI", "containers", "developer tooling"],
		links: [{ label: "GitHub", href: `${GH}/Bagworm` }],
		note: "the mascot is named after this one, not the other way round.",
		quip: "yeah. that's the one i live in.",
	},
	{
		id: "cephalote-bench",
		name: "Cephalote-Bench",
		binomial: "Cephalotes metricus",
		kind: "instrument",
		art: "cephalote",
		tagline: "Proof that Cephalote is fast enough to sit in CI.",
		description:
			"Scans five real repositories five times each on an ordinary GitHub runner: flask, django, openssl, gitea and kubernetes. The job fails if any median goes over 90 seconds, so it works as a regression gate as well as a benchmark. Kubernetes is 13,139 files and takes about 2.1 seconds. Cloning it takes longer than scanning it.",
		taxonomy: {
			order: "Shell, run by GitHub Actions",
			habitat: "ubuntu-latest, 4 vCPU",
			diet: "5.1 million lines of Kubernetes",
			stage: "on a schedule",
			described: "July 2026",
		},
		tags: ["benchmarks", "CI", "GitHub Actions", "performance"],
		links: [{ label: "GitHub", href: `${GH}/Cephalote-Bench` }],
		note: "numbers you can re-run, or they're just marketing.",
	},
	{
		id: "npm-package-template",
		name: "npmPackageTemplate",
		binomial: "Theca modularis",
		kind: "cast",
		art: "cocoon",
		tagline: "A TypeScript library skeleton with the tooling already wired up.",
		description:
			"ESM the whole way down: type module, nodenext resolution, and a barrel that re-exports with .js specifiers. Tests run on Node's own test runner straight against TypeScript through tsx, so there is no test framework and no build step before you can run them. Also fitted: ESLint, TypeDoc, commitlint, git-cliff changelogs, lefthook, and CI on Linux, macOS and Windows across Node 22 and 24.",
		taxonomy: {
			order: "TypeScript",
			habitat: "the first ten minutes of a new package",
			diet: "setup you'd rather not do twice",
			stage: "template",
			described: "June 2026",
		},
		tags: ["TypeScript", "ESM", "template", "TypeDoc", "lefthook"],
		links: [{ label: "GitHub", href: `${GH}/npmPackageTemplate` }],
		note: "publishing is left manual on purpose.",
	},
	{
		id: "py-package-template",
		name: "pyPackageTemplate",
		binomial: "Theca serpentis",
		kind: "cast",
		art: "cocoon",
		tagline: "The same skeleton, in Python.",
		description:
			"Hatchling for packaging, mypy in strict mode, ruff for lint and formatting, and the standard library's unittest. Conventional commits feed git-cliff changelogs, lefthook installs the hooks, and GitHub Actions runs lint and tests. A release script bumps the version, regenerates the changelog and tags it.",
		taxonomy: {
			order: "Python",
			habitat: "the first ten minutes of a new package",
			diet: "untyped code, briefly",
			stage: "template",
			described: "June 2026",
		},
		tags: ["Python", "hatchling", "mypy", "ruff", "template"],
		links: [{ label: "GitHub", href: `${GH}/pyPackageTemplate` }],
		note: "strict mypy from line one is easier than strict mypy later.",
	},
	{
		id: "nodeaddons",
		name: "nodeaddons",
		binomial: "Theca nativa",
		kind: "cast",
		art: "cocoon",
		tagline: "A native addon skeleton: C++ underneath, a typed import on top.",
		description:
			"The least reached-for of the three templates, and the biggest time saver when you do need it. A C++ addon built by node-gyp, wrapped in a typed ESM entry point that loads the binary through createRequire, because .node files can't be imported as ESM and everyone finds that out the hard way. Jest runs against the built addon rather than a mock of it. Same tooling as the other two.",
		taxonomy: {
			order: "C++ and TypeScript, via N-API",
			habitat: "when a hot path stops being fast enough in JavaScript",
			diet: "node-gyp incantations",
			stage: "template",
			described: "June 2026",
		},
		tags: ["C++", "N-API", "node-gyp", "native addons", "template"],
		links: [{ label: "GitHub", href: `${GH}/nodeaddons` }],
		note: "least used of the three. most time saved when it is.",
	},
];

export const byId = (id: string): Specimen | undefined =>
	SPECIMENS.find((s) => s.id === id);

export const tankSpecimens = (): Specimen[] => SPECIMENS.filter((s) => s.inTank);

export const byKind = (kind: Kind): Specimen[] =>
	SPECIMENS.filter((s) => s.kind === kind);

/** Accession numbers, in catalogue order: SMD-001, SMD-002, and so on. */
const ACCESSION = new Map(
	SPECIMENS.map((s, i) => [s.id, `SMD-${String(i + 1).padStart(3, "0")}`]),
);

export const accession = (s: Specimen): string =>
	ACCESSION.get(s.id) ?? "SMD-???";
