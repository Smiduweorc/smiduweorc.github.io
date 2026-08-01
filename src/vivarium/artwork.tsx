// Specimen artwork.
//
// The org already draws its own animals: every flagship repo ships a
// hand-drawn, side-on line study in assets/logo.png, and those are the real
// thing: correct anatomy, correct number of legs, drawn by someone who was
// looking at the animal. This site uses them rather than inventing a second,
// worse set.
//
// They are white line art on a near-black field, so they ship as alpha masks
// (built by scripts/build-artwork.py) and get painted with
// `background-color: currentColor`. That means one file per animal instead of
// one per animal per theme, and the linework always sits at the right contrast
// against whichever palette is on.
//
// The four repos with no logo of their own get a plain SVG in the same
// single-weight line style. They are deliberately legless things, a cocoon
// and a grub, because a drawing that never claims to have six legs can never
// be caught having drawn them wrong.

export type Artwork =
	| { kind: "mask"; src: string; ratio: number; scale: number }
	| { kind: "line"; draw: "cocoon" | "grub"; ratio: number; scale: number };

// Ratios are the trimmed mask dimensions printed by build-artwork.py. They
// only exist so layout can reserve the right box before the image loads.
export const ARTWORK = {
	lacewing: {
		kind: "mask",
		src: "/collection/lacewing.png",
		ratio: 693 / 317,
		scale: 1,
	},
	cephalote: {
		kind: "mask",
		src: "/collection/cephalote.png",
		ratio: 682 / 489,
		scale: 0.92,
	},
	// Drawn tall and compact, so matching the others on width would make it
	// the biggest thing in the case by some way. Sized down until it sits
	// below the ant, which is roughly the truth of it.
	bagworm: {
		kind: "mask",
		src: "/collection/bagworm.png",
		ratio: 171 / 142,
		scale: 0.58,
	},
	cocoon: { kind: "line", draw: "cocoon", ratio: 120 / 76, scale: 0.3 },
	grub: { kind: "line", draw: "grub", ratio: 120 / 76, scale: 0.34 },
} as const satisfies Record<string, Artwork>;

export type ArtworkKey = keyof typeof ARTWORK;

/** Width ÷ height, so callers can reserve the right box before it loads. */
export const artworkRatio = (key: ArtworkKey): number => ARTWORK[key].ratio;

/** Relative display size in the vivarium. Tuned by eye, per drawing: the
 *  logos were drawn at whatever size suited each repo's README, not to a
 *  shared scale, so one formula over the aspect ratios cannot fix them. */
export const artworkScale = (key: ArtworkKey): number => ARTWORK[key].scale;

// ── The two drawn-here ones ─────────────────────────────────────────
// Single stroke weight, no fills, to sit beside the real logos without
// looking like they came from a different collection.

function Cocoon({ className = "" }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 120 76"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{/* the silk anchor it hangs from */}
			<path d="M60 6 L60 16" />
			<path d="M52 7 C 58 11, 62 11, 68 7" />
			{/* the case */}
			<path d="M60 16 C 84 22, 94 40, 88 56 C 83 68, 70 72, 60 72 C 50 72, 37 68, 32 56 C 26 40, 36 22, 60 16 Z" />
			{/* segment ridges */}
			<path d="M38 34 C 52 39, 68 39, 82 34" opacity="0.7" />
			<path d="M34 45 C 50 51, 70 51, 86 45" opacity="0.7" />
			<path d="M37 56 C 51 61, 69 61, 83 56" opacity="0.7" />
			{/* the wing cases showing through, which is the only hint of an animal */}
			<path d="M52 22 C 46 34, 46 50, 52 62" opacity="0.5" />
			<path d="M68 22 C 74 34, 74 50, 68 62" opacity="0.5" />
		</svg>
	);
}

function Grub({ className = "" }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 120 76"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{/* fat, curled, legless and unbothered */}
			<path d="M96 34 C 100 20, 88 10, 68 12 C 44 14, 22 24, 16 42 C 12 56, 24 66, 44 66 C 68 66, 90 54, 96 40" />
			<path d="M96 40 C 92 46, 84 50, 76 51" />
			{/* body segments */}
			<path d="M78 13 C 72 24, 71 40, 76 51" opacity="0.7" />
			<path d="M62 15 C 55 27, 54 48, 60 62" opacity="0.7" />
			<path d="M46 20 C 39 32, 38 52, 44 66" opacity="0.7" />
			<path d="M31 28 C 25 38, 25 52, 30 62" opacity="0.7" />
			{/* head end */}
			<circle cx="99" cy="30" r="1.6" fill="currentColor" stroke="none" />
			<path d="M102 26 C 107 23, 111 22, 114 23" opacity="0.8" />
		</svg>
	);
}

export function Plate({
	artwork,
	className = "",
	alt = "",
}: {
	artwork: ArtworkKey;
	className?: string;
	alt?: string;
}) {
	const art = ARTWORK[artwork];

	if (art.kind === "line") {
		const Draw = art.draw === "cocoon" ? Cocoon : Grub;
		return <Draw className={className} />;
	}

	// A mask painted in currentColor: the drawing inherits the theme the same
	// way the text around it does.
	return (
		<span
			role={alt ? "img" : undefined}
			aria-label={alt || undefined}
			aria-hidden={alt ? undefined : true}
			className={"block bg-current " + className}
			style={{
				maskImage: `url(${art.src})`,
				WebkitMaskImage: `url(${art.src})`,
				maskRepeat: "no-repeat",
				WebkitMaskRepeat: "no-repeat",
				maskPosition: "center",
				WebkitMaskPosition: "center",
				maskSize: "contain",
				WebkitMaskSize: "contain",
			}}
		/>
	);
}
