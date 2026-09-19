// The collection. One entry per repository in the Smiduweorc org, written up
// the way a field guide writes up an animal.
//
// Everything here is real. Descriptions and numbers come from the repos. The
// taxonomy is the joke: `order` is the language, `habitat` is where the thing
// runs, `diet` is what it eats. `stage` is the one field a visitor actually
// needs, so it stays honest and short.

import type { ArtworkKey } from "./vivarium/artwork";

export type Kind = "library" | "instrument" | "cast" | "colony";

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
	colony: {
		title: "Colonies",
		blurb: "Applications. Things you host, that other people then use.",
	},
};

export const KIND_ORDER: Kind[] = ["library", "instrument", "cast", "colony"];

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
			{ label: "AUR", href: "https://aur.archlinux.org/packages/cephalote" },
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
		links: [
			{ label: "GitHub", href: `${GH}/Bagworm` },
			{ label: "AUR", href: "https://aur.archlinux.org/packages/bagworm" },
		],
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
	{
		id: "termite",
		name: "Termite",
		binomial: "Reticulitermes suffragii",
		kind: "colony",
		art: "termite",
		inTank: true,
		tagline:
			"A feedback board and release tracker for projects that ship in versions.",
		description:
			"A public board where anyone can post an idea or a bug and raise a hand for someone else's, with no signup form anywhere: accounts exist so that somebody can be the maintainer, and a visitor never needs one. An item is open, planned, shipped or declined, and that is the whole lifecycle. There is no \"in progress\", because nobody owes you a status update on a side project, and a declined item keeps its reason and stays on the board so the same request doesn't arrive four more times. The maintainer plans a version, opens its merge window, pulls items into it and ships the lot in one step; a planned release is allowed no date at all, because \"eventually\" is an honest answer and a fake date isn't. Underneath: Bun, Elysia, tRPC and Drizzle over Postgres, with a Vue front end.",
		taxonomy: {
			order: "TypeScript on Bun, Vue front end",
			habitat: "your own box, usually behind your own wireguard",
			diet: "feature requests scattered across discord threads",
			stage: "released",
			described: "August 2026",
		},
		tags: [
			"TypeScript",
			"Bun",
			"Elysia",
			"Vue",
			"tRPC",
			"Postgres",
			"self-hosted",
		],
		links: [
			{ label: "GitHub", href: `${GH}/termite` },
			{ label: "Docs", href: `${GH}/termite/blob/master/docs/docs.md` },
			{ label: "Write-up", href: "https://grmlfolio.vercel.app/" },
		],
		note: "the tokens it hands out are checked by lacewing, top drawer.",
		quip: "eats wood. this one eats the todo list instead.",
	},
	{
		id: "aphid-template",
		name: "Aphid-template",
		binomial: "Aphis terminifera",
		kind: "cast",
		art: "aphid",
		inTank: true,
		tagline: "A skeleton for wrapping an HTTP API, and a boundary it holds to.",
		description:
			"You describe each endpoint as a plain object: method, path, query, and a decode when the response needs unwrapping. A client joins the path onto the base URL, layers the headers, sends the request through a transport you supply, and decodes the result. Building an operation touches nothing, so the request side is tested on values rather than against a network. What makes it worth copying is the list of what it will not do: no retries, no caching, no breakers, no input or response validation, no logging, no reading the environment, and no work at import time. Every exclusion in the README says where that work goes instead.",
		taxonomy: {
			order: "TypeScript, ESM, Node 22+",
			habitat: "a package that wraps somebody else's API",
			diet: "policy decisions that belong to the caller",
			stage: "template",
			described: "August 2026",
		},
		tags: ["TypeScript", "HTTP", "API client", "ESM", "template"],
		links: [{ label: "GitHub", href: `${GH}/Aphid-template` }],
		note: "ants farm aphids. repletes, top drawer, is an ant.",
		quip: "makes sugar for somebody else all day. asks for nothing.",
	},
	{
		id: "dung-beetle-template",
		name: "dung-beetle-template",
		binomial: "Scarabaeus schematophagus",
		kind: "cast",
		art: "dung-beetle",
		inTank: true,
		tagline:
			"Aphid, plus a generator that writes the client from an OpenAPI document.",
		description:
			"Point the config at an API's OpenAPI document, run the generator, and it writes one readable function per endpoint for you to review, commit and publish under your own name. The generator lives in tools/ as build-time scaffolding and is never published, so the people who install your client install none of it. Each run prints the public names it added and removed, which turns a change to your package's API into something a person sees in review rather than something that lands unannounced. Where a path makes an ugly function name, a names map is where you say so. Underneath is the same runtime and the same boundary as Aphid.",
		taxonomy: {
			order: "TypeScript, ESM, Node 22+",
			habitat: "any API that publishes a schema",
			diet: "OpenAPI documents",
			stage: "template",
			described: "August 2026",
		},
		tags: [
			"TypeScript",
			"OpenAPI",
			"code generation",
			"API client",
			"template",
		],
		links: [{ label: "GitHub", href: `${GH}/dung-beetle-template` }],
		note: "the worked example generates a client for the AUR, where two drawers up now live.",
		quip: "rolls the schema uphill so you don't have to.",
	},
	{
		id: "firefly",
		name: "Firefly",
		binomial: "Lampyris resiliens",
		kind: "library",
		art: "firefly",
		inTank: true,
		tagline:
			"Retries, deadlines, breakers and bulkheads for one process, with no defaults.",
		description:
			"You describe an upstream once as a Dependency, then call through it. Attempts, backoff, deadline and breaker thresholds are all required, because they are properties of your traffic rather than of the package, and shouldRetry has no default at all: a 409 is fatal to one caller and expected by another, so the types will not let you skip the question. A policy wraps a unit of work and hands back the same shape, so policies nest and a stack of them is still one function you call; stack throws on an arrangement that cannot work. Every attempt gets an AbortSignal, so a deadline aborts the attempt instead of only giving up on waiting for it, and when the attempts run out your error comes back unchanged.",
		taxonomy: {
			order: "TypeScript, ESM, Node 22+",
			habitat: "one process, with no service mesh under it",
			diet: "upstreams that fail in ways you have to decide about",
			stage: "released",
			described: "August 2026",
		},
		tags: [
			"TypeScript",
			"retries",
			"circuit breaker",
			"rate limiting",
			"resilience",
		],
		links: [
			{ label: "GitHub", href: `${GH}/firefly` },
			{ label: "npm", href: "https://www.npmjs.com/package/firefly-limiter" },
			{ label: "Docs", href: "https://smiduweorc.github.io/firefly/" },
		],
		note: "every count belongs to one process. twenty replicas are twenty breakers.",
		quip: "the one that knows when to stop trying.",
	},
	{
		id: "repletes",
		name: "Repletes",
		binomial: "Myrmecocystus servandus",
		kind: "library",
		art: "repletes",
		inTank: true,
		tagline: "A cache policy engine: serve, refresh, replace or rethrow.",
		description:
			"You supply the key, the store and the freshness and retention windows, and Repletes decides what a read does. Fresh, it serves. Stale, it serves and refreshes behind, one refresh per key, never awaited and never an unhandled rejection. Retained, it serves only if the action failed. The stale-while-revalidate and stale-if-error semantics follow RFC 5861, and read hands back the state alongside the value, so a caller can tell a fresh answer from one that survived an upstream failure. It is not an HTTP cache and ships no transport. There is no way to prime it either, because every entry's windows describe an action that actually completed.",
		taxonomy: {
			order: "TypeScript, ESM, Node 22+",
			habitat: "in front of anything async and expensive",
			diet: "the same call, asked again",
			stage: "released",
			described: "August 2026",
		},
		tags: [
			"TypeScript",
			"caching",
			"RFC 5861",
			"stale-while-revalidate",
			"zero dependencies",
		],
		links: [
			{ label: "GitHub", href: `${GH}/Repletes` },
			{ label: "npm", href: "https://www.npmjs.com/package/repletes" },
			{ label: "Docs", href: "https://smiduweorc.github.io/Repletes/" },
		],
		note: "the caste that hangs from the nest roof as a living pantry.",
		quip: "hangs there full of last week's answer, in case you ask again.",
	},
	{
		id: "mycocepurus",
		name: "mycocepurus-smithii",
		binomial: "Mycocepurus idempotens",
		kind: "library",
		art: "mycocepurus",
		inTank: true,
		tagline:
			"Makes a POST safe to send twice: one execution per Idempotency-Key, exact replay for every retry.",
		description:
			"The client sends an Idempotency-Key; the ledger claims it in one atomic store operation, runs your handler exactly once, and replays the stored response to every retry. A key reused with a different body is a hard conflict, and two copies arriving at once produce one execution and one 409, which is what the IETF draft says should happen. Retention, lease length and maximum key length are all required, because they are properties of your clients and your store, and scope is required too, so one client can never replay another's response by guessing. The only store shipped is an in-memory one for a single process and for tests: the contract is three methods, and the atomic one is SET NX in Redis. It sits after auth and before the handler. Firefly's retry on the client is what sends the second copy; this is the server holding the client to its promise that it is the same request.",
		taxonomy: {
			order: "TypeScript, ESM, Node 22+",
			habitat: "the server side of a retried POST",
			diet: "the same request, arriving twice",
			stage: "released",
			described: "September 2026",
		},
		tags: [
			"TypeScript",
			"idempotency",
			"Idempotency-Key",
			"IETF draft",
			"HTTP",
			"zero dependencies",
		],
		links: [
			{ label: "GitHub", href: `${GH}/mycocepurus-smithii` },
			{
				label: "npm",
				href: "https://www.npmjs.com/package/mycocepurus-smithii",
			},
			{
				label: "Docs",
				href: "https://smiduweorc.github.io/mycocepurus-smithii/",
			},
		],
		note: "a fungus-farming ant with no males. every worker is a copy of the last, on purpose.",
		quip: "already did that one. here's what happened last time.",
	},
	{
		id: "phasmid",
		name: "Phasmid",
		binomial: "Carausius canonicus",
		kind: "library",
		art: "phasmid",
		inTank: true,
		tagline:
			"Provider-aware email canonicalization, so equal mailboxes compare equal.",
		description:
			"Mail providers each have their own idea of which addresses reach the same mailbox: Gmail ignores dots and anything after a plus, and googlemail.com is gmail.com; Yahoo tags with a hyphen; AOL does not tag at all. Phasmid knows the rules for fifteen providers and returns one canonical string per mailbox, so a dedupe or a re-registration check can compare with ===. A domain it does not recognise gets the conservative treatment, domain lowercased and local part left alone, because RFC 5321 allows case-sensitive local parts and merging two real mailboxes by accident is worse than missing an alias. Every rule is overridable: add a provider, override a built-in by domain, replace the lot, or set a default rule for the domains it does not know. Runs in the browser and in Node, pure ESM, nothing at runtime.",
		taxonomy: {
			order: "TypeScript, ESM, browser and Node",
			habitat: "signup forms and the users table behind them",
			diet: "j.o.h.n+promo@googlemail.com",
			stage: "released",
			described: "September 2026",
		},
		tags: [
			"TypeScript",
			"email",
			"normalization",
			"canonicalization",
			"zero dependencies",
		],
		links: [
			{ label: "GitHub", href: `${GH}/phasmid` },
			{ label: "npm", href: "https://www.npmjs.com/package/phasmid" },
			{ label: "Docs", href: "https://smiduweorc.github.io/phasmid/" },
		],
		note: "looks like a twig. isn't. same trick an aliased address pulls.",
		quip: "looks like a new user. isn't. i can tell.",
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
