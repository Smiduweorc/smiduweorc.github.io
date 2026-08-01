import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";

// Ported from grml's lab, where Bagworm was hired first. The behaviour is
// unchanged. What left with the port is the two-audience gate: this site has
// one audience (developers), so the cold open greets you and gets out of the
// way rather than asking which tour you want.
//
// Frame-accurate behaviour spec: image_assets/bagworm/svg/BEHAVIOUR.md
// All frames share the same width and are registered on the can's base,
// so bottom-centre alignment keeps the animation stable across swaps.

type Frame =
	| "can"
	| "front"
	| "hi"
	| "talk"
	| "leanL"
	| "leanR"
	| "flopL"
	| "flopR"
	| "dizzy1"
	| "dizzy2";

const FRAME_SRC: Record<Frame, string> = {
	can: "/bagworm/can.webp",
	front: "/bagworm/bagworm_front.webp",
	hi: "/bagworm/bagworm_front_hi.webp",
	talk: "/bagworm/bagworm_front_excited_talk.webp",
	leanL: "/bagworm/bagworm_lean_left.webp",
	leanR: "/bagworm/bagworm_lean_right.webp",
	flopL: "/bagworm/bagworm_left.webp",
	flopR: "/bagworm/bagworm_right.webp",
	dizzy1: "/bagworm/bagworm_dizzy.webp",
	dizzy2: "/bagworm/bagworm_dizzy2.webp",
};

// Tallest frame is dizzy (800x1029); reserve that box so swaps never reflow.
const FRAME_ASPECT = 800 / 1029;

// Custom event other components use to summon Bagworm for a specific
// remark (e.g. a hovered/tapped project card). See bagwormQuip() below.
const QUIP_EVENT = "bagworm:quip";

/** Ask Bagworm to walk over to `anchor` and say `line`. No-op if he's mid
 * drag/drop or dizzy. Same guard as section-following. */
export function bagwormQuip(anchor: HTMLElement | null, line: string) {
	if (!anchor) return;
	window.dispatchEvent(
		new CustomEvent(QUIP_EVENT, { detail: { anchor, line } }),
	);
}

const LINES = {
	hi: "oh! hi! 👋",
	welcome:
		"welcome to smiduweorc! we keep the whole collection alive in there. mind the glass.",
	enter: "go on then, have a poke around!",
	impatient: "…still there? 👀",
	dizzy: "w-woah…",
};

/** True on touch devices: no cursor, so no hover and no continuous stream of
 * "where you are pointing" to lean toward. Several behaviours below need a
 * different input to stand in for it. */
function useCoarsePointer(): boolean {
	const [coarse, setCoarse] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(pointer: coarse)").matches,
	);
	useEffect(() => {
		const mq = window.matchMedia("(pointer: coarse)");
		const onChange = () => setCoarse(mq.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);
	return coarse;
}

// ── Tilt access ──
// A phone's accelerometer is the closest thing touch has to a cursor: it is
// continuous, and it says which way you are leaning. iOS 13+ only hands it
// over from inside a user gesture, so the gate's choice tap does the asking
// (grml's call, 2026-07-25). Tilt is a garnish; everything works without it.

const TILT_EVENT = "bagworm:tilt";
let tiltAllowed = false;

type OrientationCtor = typeof DeviceOrientationEvent & {
	requestPermission?: () => Promise<string>;
};

function markTiltAllowed() {
	if (tiltAllowed) return;
	tiltAllowed = true;
	window.dispatchEvent(new CustomEvent(TILT_EVENT));
}

/** Ask for orientation access from inside a user gesture. Silently gives up
 * where the API is missing or the visitor declines. */
function requestTiltAccess() {
	if (typeof window === "undefined" || tiltAllowed) return;
	if (!window.matchMedia("(pointer: coarse)").matches) return;
	if (!("DeviceOrientationEvent" in window)) return;
	const ctor = window.DeviceOrientationEvent as OrientationCtor;
	if (typeof ctor.requestPermission !== "function") {
		markTiltAllowed(); // no permission gate on this browser
		return;
	}
	ctor.requestPermission().then(
		(state) => {
			if (state === "granted") markTiltAllowed();
		},
		() => {},
	);
}

function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const onChange = () => setReduced(mq.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);
	return reduced;
}

/** setTimeout/setInterval that clean themselves up on unmount. */
function useTimers() {
	const ids = useRef<{ t: number[]; i: number[]; r: number[] }>({
		t: [],
		i: [],
		r: [],
	});
	useEffect(() => {
		const current = ids.current;
		return () => {
			current.t.forEach(clearTimeout);
			current.i.forEach(clearInterval);
			current.r.forEach(cancelAnimationFrame);
		};
	}, []);
	return useRef({
		later(fn: () => void, ms: number) {
			const id = window.setTimeout(fn, ms);
			ids.current.t.push(id);
			return id;
		},
		every(fn: () => void, ms: number) {
			const id = window.setInterval(fn, ms);
			ids.current.i.push(id);
			return id;
		},
		frame(fn: FrameRequestCallback) {
			const id = requestAnimationFrame(fn);
			ids.current.r.push(id);
			return id;
		},
	}).current;
}

function usePreloadFrames() {
	useEffect(() => {
		Object.values(FRAME_SRC).forEach((src) => {
			const img = new Image();
			img.src = src;
		});
	}, []);
}

function Bubble({
	children,
	className = "",
	tail = "down",
}: {
	children: ReactNode;
	className?: string;
	tail?: "down" | "up";
}) {
	return (
		<div
			className={
				"bw-bubble font-hand relative rounded-2xl border border-theme-border bg-theme-panel px-4 py-3 text-sm leading-relaxed text-theme-text shadow-xl w-fit max-w-md text-center " +
				className
			}
		>
			{children}
			<span
				aria-hidden="true"
				className={
					"absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-theme-panel " +
					(tail === "down"
						? "-bottom-[7px] border-b border-r border-theme-border"
						: "-top-[7px] border-t border-l border-theme-border")
				}
			/>
		</div>
	);
}

// One door, one button. The old two-audience fork is gone: everything here
// is aimed at developers, so asking would only have added a click.
function EnterButton({
	onEnter,
	onHover,
}: {
	onEnter: () => void;
	onHover: (leaning: boolean) => void;
}) {
	// Touch has no hover, but it does have a press phase: the finger is down
	// on a button for a moment before the tap commits. That is the same
	// "considering it" beat a cursor hover gives, so lean on it too.
	const consider = {
		onMouseEnter: () => onHover(true),
		onMouseLeave: () => onHover(false),
		onFocus: () => onHover(true),
		onBlur: () => onHover(false),
		onPointerDown: () => onHover(true),
		onPointerUp: () => onHover(false),
		onPointerCancel: () => onHover(false),
	};
	return (
		<div className="mt-3 flex justify-center">
			<button
				{...consider}
				onClick={onEnter}
				className="rounded-lg border border-theme-accent/70 bg-theme-accent/20 px-4 py-2 text-sm font-medium text-theme-text-primary transition hover:bg-theme-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
			>
				let me in
			</button>
		</div>
	);
}

function WormImage({
	frame,
	boing,
	bob,
	imgRef,
	onPointerDown,
	interactive,
}: {
	frame: Frame;
	boing: boolean;
	bob: boolean;
	imgRef?: React.RefObject<HTMLImageElement | null>;
	onPointerDown?: (e: React.PointerEvent<HTMLImageElement>) => void;
	interactive?: boolean;
}) {
	return (
		<div
			className={"relative w-full " + (bob ? "bw-bob" : "")}
			style={{ aspectRatio: FRAME_ASPECT }}
		>
			<img
				ref={imgRef}
				src={FRAME_SRC[frame]}
				alt=""
				draggable={false}
				onPointerDown={onPointerDown}
				className={
					"pointer-events-auto absolute inset-x-0 bottom-0 w-full select-none " +
					(boing ? "bw-boing " : "") +
					(interactive ? "cursor-grab touch-none" : "")
				}
			/>
		</div>
	);
}

// ─── The gate: cold-open greeter overlay ─────────────────────────────

export function BagwormGate({ onDone }: { onDone: () => void }) {
	const reduced = usePrefersReducedMotion();
	const timers = useTimers();
	usePreloadFrames();

	const [frame, setFrame] = useState<Frame>(reduced ? "front" : "can");
	const [stage, setStage] = useState<"enter" | "ask" | "react" | "leave">(
		"enter",
	);
	const [line, setLine] = useState<string | null>(reduced ? LINES.hi : null);
	const [boing, setBoing] = useState(false);
	const [fading, setFading] = useState(false);
	const answered = useRef(false);
	const impatientTimer = useRef<number | null>(null);
	const swayInterval = useRef<number | null>(null);

	const stopImpatience = useCallback(() => {
		if (impatientTimer.current !== null) clearTimeout(impatientTimer.current);
		if (swayInterval.current !== null) clearInterval(swayInterval.current);
		impatientTimer.current = null;
		swayInterval.current = null;
	}, []);

	const armImpatience = useCallback(() => {
		if (reduced) return;
		stopImpatience();
		impatientTimer.current = timers.later(() => {
			if (answered.current) return;
			setLine(LINES.impatient);
			let left = true;
			setFrame("leanL");
			swayInterval.current = timers.every(() => {
				left = !left;
				setFrame(left ? "leanL" : "leanR");
			}, 900);
		}, 6500);
	}, [reduced, stopImpatience, timers]);

	// The cold open, frame by frame (BEHAVIOUR.md §cold open).
	useEffect(() => {
		if (reduced) {
			timers.later(() => setFrame("hi"), 300);
			timers.later(() => {
				setStage("ask");
				setFrame("talk");
				setLine(LINES.welcome);
			}, 1200);
			return;
		}
		// 1. can slides in (CSS) → 2. boing, springs up → 3. slight wave
		// → 4. the welcome, and the door.
		timers.later(() => {
			setFrame("front");
			setBoing(true);
		}, 1000);
		timers.later(() => setBoing(false), 1650);
		timers.later(() => {
			setFrame("hi");
			setLine(LINES.hi);
		}, 1800);
		timers.later(() => {
			setStage("ask");
			setFrame("talk");
			setLine(LINES.welcome);
			armImpatience();
		}, 3200);
	}, []);

	const onHover = useCallback(
		(leaning: boolean) => {
			if (answered.current || stage !== "ask") return;
			stopImpatience();
			setFrame(leaning ? "leanR" : "talk");
			setLine(LINES.welcome);
			if (!leaning) armImpatience();
		},
		[stage, stopImpatience, armImpatience],
	);

	const enter = useCallback(() => {
		if (answered.current) return;
		answered.current = true;
		// Must happen inside the tap itself; iOS grants motion access
		// from a user gesture or not at all.
		requestTiltAccess();
		stopImpatience();
		setStage("react");
		setFrame("talk");
		setLine(LINES.enter);
		timers.later(() => {
			setStage("leave");
			setFrame("can");
			setLine(null);
		}, 1400);
		timers.later(() => setFading(true), 1800);
		timers.later(onDone, 2400);
	}, [onDone, stopImpatience, timers]);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Welcome to the Smiduweorc vivarium"
			className={
				"fixed inset-0 z-[60] flex flex-col items-center justify-center bg-theme-bg px-6 transition-opacity duration-500 " +
				(fading ? "pointer-events-none opacity-0" : "opacity-100")
			}
		>
			<div className="flex w-full max-w-sm flex-col items-center">
				<div className="mb-4 min-h-[7.5rem] w-full max-w-xs">
					{line && (
						<Bubble className="mx-auto text-center">
							<span>{line}</span>
							{stage === "ask" && (
								<EnterButton onEnter={enter} onHover={onHover} />
							)}
						</Bubble>
					)}
				</div>
				<div className={"w-32 " + (reduced ? "" : "bw-slide-in")}>
					<WormImage
						frame={frame}
						boing={boing}
						bob={
							!reduced &&
							!boing &&
							(frame === "front" || frame === "talk") &&
							stage !== "leave"
						}
					/>
				</div>
			</div>
		</div>
	);
}

// ─── Parked mascot: idle life and drag toy ───────────────────────────
// Poking the worm gets you a wave and nothing else. He is furniture with
// opinions, not navigation.

type ParkedMode = "popped" | "napping" | "dizzy" | "ducked";

type Pos = { x: number; y: number };

// Drag/idle tuning. See BEHAVIOUR.md §Interactions.
const DRAG_FLOP_AT = 6; // px of horizontal travel before he flops that way
const NAP_AFTER_MS = 9000;
const WAKE_DISTANCE_PX = 140;
const WAKE_SCROLL_PX = 80; // scrolling this far wakes him where there's no cursor
const TILT_LEAN_DEG = 20; // tilt past this and he leans with the phone
const TILT_REST_DEG = 10; // back inside this and he straightens up
const SHAKE_SWING_DEG = 150; // total wobble within SHAKE_WINDOW_MS to go dizzy
const SHAKE_WINDOW_MS = 600;
const EDGE_MARGIN = 12; // gap kept from the screen edges when parked
const DROP_PX = 28; // how far he falls when you let go
const SECTION_GRACE_MS = 11000; // pause section-following this long after a drag
const SCROLL_SETTLE_MS = 260; // he only moves once scrolling has stopped
const HEADING_GAP = 20; // gap between a heading and where he stands beside it
const BUBBLE_CLEARANCE_PX = 100; // room the speech bubble needs above him

export function BagwormParked({ sceneKey }: { sceneKey: string }) {
	const reduced = usePrefersReducedMotion();
	const coarse = useCoarsePointer();
	const timers = useTimers();
	usePreloadFrames();

	const [mode, setMode] = useState<ParkedMode>("popped");
	const [frame, setFrame] = useState<Frame>("front");
	const [line, setLine] = useState<string | null>(null);
	const [boing, setBoing] = useState(false);
	const [idleEpoch, setIdleEpoch] = useState(0);

	const rootRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const modeRef = useRef(mode);
	modeRef.current = mode;

	// ── Free positioning ──
	// The can lives at an absolute (left, top). We drive the element's style
	// directly (like a game object) so drags don't thrash React state.
	const posRef = useRef<Pos>({ x: EDGE_MARGIN, y: 0 });
	const draggedAt = useRef(0); // timestamp of the last manual drag

	const wormSize = useCallback(() => {
		const el = rootRef.current;
		// Fallbacks match the w-16/w-24 box above, at the tallest frame's aspect.
		return { w: el?.offsetWidth ?? 96, h: el?.offsetHeight ?? 123 };
	}, []);

	// The header is sticky at the very top of the page, so however close a
	// heading sits to it, he still needs to stand below its bottom edge ,
	// otherwise he ends up parked behind/under the header instead of beside
	// the heading he's supposed to be greeting (worst for the wordmark, the
	// very first heading on the page).
	const topClearance = useCallback(() => {
		const header = document.querySelector("header");
		return (header?.getBoundingClientRect().bottom ?? 0) + EDGE_MARGIN;
	}, []);

	const clamp = useCallback(
		(x: number, y: number): Pos => {
			const { w, h } = wormSize();
			return {
				x: Math.max(8, Math.min(window.innerWidth - w - 8, x)),
				y: Math.max(
					topClearance(),
					Math.min(window.innerHeight - h - 8, y),
				),
			};
		},
		[wormSize, topClearance],
	);

	const applyPos = useCallback((animate: boolean) => {
		const el = rootRef.current;
		if (!el) return;
		el.style.transition = animate
			? "left 0.7s cubic-bezier(0.22, 1, 0.36, 1), top 0.7s cubic-bezier(0.22, 1, 0.36, 1)"
			: "none";
		el.style.left = `${posRef.current.x}px`;
		el.style.top = `${posRef.current.y}px`;
	}, []);

	// Where he stands to keep a heading company: just past its right edge,
	// feet level with its baseline.
	//
	// Nothing ever fits beside a heading on a phone (a full-width heading plus
	// HEADING_GAP plus his own width always overflows), so that path used to
	// pin him to the bottom-left corner for an entire mobile session and he
	// never appeared to walk anywhere. Instead he now paces the bottom edge,
	// swapping corners each time he is called over, so being summoned still
	// reads as movement.
	const standBeside = useCallback(
		(el: Element | null): Pos => {
			const { w, h } = wormSize();
			if (el) {
				const r = el.getBoundingClientRect();
				const x = r.right + HEADING_GAP;
				if (x + w + EDGE_MARGIN <= window.innerWidth) {
					return clamp(x, r.bottom - h);
				}
			}
			const floor = window.innerHeight - h - EDGE_MARGIN;
			if (!el) return clamp(EDGE_MARGIN, floor);
			const onLeft = posRef.current.x + w / 2 < window.innerWidth / 2;
			return clamp(onLeft ? window.innerWidth - w - EDGE_MARGIN : EDGE_MARGIN, floor);
		},
		[clamp, wormSize],
	);

	// Place him next to the page title on mount, before first paint.
	useLayoutEffect(() => {
		posRef.current = standBeside(document.querySelector("main h1, main h2"));
		applyPos(false);
	}, [applyPos, standBeside]);

	// Keep him on-screen through resizes / orientation changes.
	useEffect(() => {
		const onResize = () => {
			posRef.current = clamp(posRef.current.x, posRef.current.y);
			applyPos(false);
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [applyPos, clamp]);

	const doBoing = useCallback(() => {
		if (reduced) return;
		setBoing(true);
		timers.later(() => setBoing(false), 600);
	}, [reduced, timers]);

	// A small head-only tilt for character while he's being flung about.
	const setWormLean = useCallback((deg: number) => {
		if (imgRef.current) {
			imgRef.current.style.transform = deg ? `rotate(${deg}deg)` : "";
		}
	}, []);

	const settling = useRef(false);

	// A speech line's own auto-clear timeout, so a later line (a fresh
	// hover, a new section) always cancels whatever stale timer was still
	// pending from the previous one. Otherwise an old timer can fire
	// after a newer line replaced it and cut the new one short.
	const speechClearRef = useRef<number | null>(null);
	const clearPendingSpeech = useCallback(() => {
		if (speechClearRef.current !== null) {
			clearTimeout(speechClearRef.current);
			speechClearRef.current = null;
		}
	}, []);

	const backToFront = useCallback(() => {
		clearPendingSpeech();
		tiltFrame.current = null;
		setWormLean(0);
		setFrame("front");
		setMode("popped");
		setLine(null);
		setIdleEpoch((n) => n + 1);
	}, [clearPendingSpeech, setWormLean]);

	const goDizzy = useCallback(() => {
		setWormLean(0);
		setMode("dizzy");
		setLine(LINES.dizzy);
		let first = true;
		setFrame("dizzy1");
		const spin = timers.every(() => {
			first = !first;
			setFrame(first ? "dizzy1" : "dizzy2");
		}, 160);
		timers.later(() => {
			clearInterval(spin);
			// brief stunned beat, then he shakes it off
			timers.later(backToFront, 350);
		}, 1900);
	}, [backToFront, setWormLean, timers]);

	// Idle life while popped: attend toward the page centre, then doze.
	useEffect(() => {
		if (mode !== "popped") return;
		const nap = timers.later(() => {
			// never doze off mid-drag or while landing from one
			if (draggingRef.current || settling.current) return;
			setFrame("can");
			setMode("napping");
		}, NAP_AFTER_MS);
		let leaning = false;
		const lean = timers.every(() => {
			if (draggingRef.current || settling.current) return;
			// tilt is driving which way he leans; don't fight it on a timer
			if (tiltActive.current) return;
			leaning = !leaning;
			if (!leaning) {
				setFrame("front");
				return;
			}
			// lean toward the middle of the screen from wherever he's parked
			const { w } = wormSize();
			const centreX = posRef.current.x + w / 2;
			setFrame(centreX < window.innerWidth / 2 ? "leanR" : "leanL");
		}, 3800);
		return () => {
			clearTimeout(nap);
			clearInterval(lean);
		};
	}, [mode, idleEpoch, timers, wormSize]);

	// Wake from nap when the cursor comes near, or, with no cursor to come
	// near with, when the page starts moving again. Scrolling is the only
	// ambient "someone is still here" signal touch gives us.
	useEffect(() => {
		if (mode !== "napping") return;
		const wake = () => {
			doBoing();
			backToFront();
		};
		const onMove = (e: MouseEvent) => {
			const el = rootRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			const cx = r.left + r.width / 2;
			const cy = r.top + r.height / 2;
			if (Math.hypot(e.clientX - cx, e.clientY - cy) < WAKE_DISTANCE_PX) {
				wake();
			}
		};
		let travelled = 0;
		let lastY = window.scrollY;
		const onScroll = () => {
			travelled += Math.abs(window.scrollY - lastY);
			lastY = window.scrollY;
			if (travelled >= WAKE_SCROLL_PX) wake();
		};
		document.addEventListener("mousemove", onMove);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			document.removeEventListener("mousemove", onMove);
			window.removeEventListener("scroll", onScroll);
		};
	}, [mode, backToFront, doBoing]);

	// ── Section-following: he walks over to the section you settled on,
	// and says whatever that section is tagged with (data-bagworm-line) ──
	const CONTEXT_LINE_MS = 6000;

	const speakAt = useCallback(
		(anchor: HTMLElement | null, line?: string) => {
			if (
				draggingRef.current ||
				settling.current ||
				modeRef.current === "dizzy"
			) {
				return;
			}
			posRef.current = standBeside(anchor);
			applyPos(true);
			if (modeRef.current === "napping" || modeRef.current === "ducked") {
				backToFront();
			}
			doBoing();
			clearPendingSpeech();
			if (line) {
				setWormLean(0);
				setFrame("talk");
				setLine(line);
				speechClearRef.current = timers.later(() => {
					speechClearRef.current = null;
					if (modeRef.current === "popped") backToFront();
				}, CONTEXT_LINE_MS);
			}
		},
		[
			standBeside,
			applyPos,
			backToFront,
			doBoing,
			setWormLean,
			timers,
			clearPendingSpeech,
		],
	);

	const moveToSection = useCallback(
		(section: HTMLElement | null) => {
			const heading = section?.querySelector<HTMLElement>("h1, h2") ?? section;
			speakAt(heading, section?.dataset.bagwormLine);
		},
		[speakAt],
	);

	// Finds whichever `main section` the reading line (35% down the
	// viewport) currently sits in. Shared by the scroll-follow effect below
	// and the scene-change effect, so both agree on "where he should be".
	const activeSection = useCallback((): {
		index: number;
		el: HTMLElement | null;
	} => {
		const list = Array.from(
			document.querySelectorAll<HTMLElement>("main section"),
		);
		if (!list.length) return { index: -1, el: null };
		const line = window.innerHeight * 0.35;
		let index = 0;
		list.forEach((s, i) => {
			if (s.getBoundingClientRect().top <= line) index = i;
		});
		return { index, el: list[index] };
	}, []);

	// Whichever [data-bagworm-quip] element the reading line currently sits
	// inside. On touch there is no hover, so what you have scrolled to the
	// middle of the screen stands in for what you are pointing at.
	const activeQuip = useCallback((): HTMLElement | null => {
		const line = window.innerHeight * 0.42;
		const list = Array.from(
			document.querySelectorAll<HTMLElement>("[data-bagworm-quip]"),
		);
		return (
			list.find((el) => {
				const r = el.getBoundingClientRect();
				return r.top <= line && r.bottom >= line;
			}) ?? null
		);
	}, []);

	const lastActiveRef = useRef(-1);
	const lastQuipRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (reduced) return;
		// He only moves once scrolling has settled. Mid-scroll he stays put.
		lastActiveRef.current = activeSection().index;
		let idle: number | undefined;
		const onSettled = () => {
			idle = undefined;
			const { index, el } = activeSection();
			const movedSection = index !== lastActiveRef.current;
			lastActiveRef.current = index;
			if (Date.now() - draggedAt.current < SECTION_GRACE_MS) return;
			if (coarse) {
				const card = activeQuip();
				if (card !== lastQuipRef.current) {
					lastQuipRef.current = card;
					if (card) {
						speakAt(card, card.dataset.bagwormQuip);
						return;
					}
				} else if (card) {
					// still parked on the same card; don't drag him back to
					// the heading behind it
					return;
				}
			}
			if (movedSection) moveToSection(el);
		};
		const onScroll = () => {
			if (idle !== undefined) clearTimeout(idle);
			idle = window.setTimeout(onSettled, SCROLL_SETTLE_MS);
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			if (idle !== undefined) clearTimeout(idle);
		};
	}, [reduced, coarse, moveToSection, activeSection, activeQuip, speakAt]);

	// The page swaps whole sections in place (nav-bar page/view switches)
	// without a scroll event firing, so re-read what's under him whenever
	// that happens and greet whatever landed there.
	useEffect(() => {
		if (reduced) return;
		const { index, el } = activeSection();
		lastActiveRef.current = index;
		lastQuipRef.current = null; // different page, different cards
		moveToSection(el);
		// sceneKey is the only intended trigger.
	}, [sceneKey, reduced, activeSection, moveToSection]);

	// ── Quips: other components can summon him to say something specific
	// (e.g. a hovered project card on the Visitor tour) via bagwormQuip() ──
	useEffect(() => {
		if (reduced) return;
		const onQuip = (e: Event) => {
			const detail = (e as CustomEvent<{ anchor: HTMLElement; line: string }>)
				.detail;
			if (!detail?.anchor) return;
			speakAt(detail.anchor, detail.line);
		};
		window.addEventListener(QUIP_EVENT, onQuip);
		return () => window.removeEventListener(QUIP_EVENT, onQuip);
	}, [reduced, speakAt]);

	// ── Tilt: the phone's own "which way are you pointing" ──
	// Granted (or not) back at the gate. He leans with the device, and a good
	// shake makes him as dizzy as being flung across the screen does.
	const tiltActive = useRef(false);
	const tiltFrame = useRef<Frame | null>(null);

	const [tiltOn, setTiltOn] = useState(tiltAllowed);
	useEffect(() => {
		if (tiltOn) return;
		const onAllowed = () => setTiltOn(true);
		window.addEventListener(TILT_EVENT, onAllowed);
		return () => window.removeEventListener(TILT_EVENT, onAllowed);
	}, [tiltOn]);

	useEffect(() => {
		if (reduced || !coarse || !tiltOn) return;
		let last: number | null = null;
		let swing = 0;
		let windowStart = 0;
		let shakenAt = 0;
		const onTilt = (e: DeviceOrientationEvent) => {
			const g = e.gamma;
			if (g === null || g === undefined) return;
			tiltActive.current = true;

			// wobble adds up; enough of it in a short window is a shake
			const now = Date.now();
			if (now - windowStart > SHAKE_WINDOW_MS) {
				windowStart = now;
				swing = 0;
			}
			if (last !== null) swing += Math.abs(g - last);
			last = g;
			if (
				swing > SHAKE_SWING_DEG &&
				now - shakenAt > 3000 &&
				modeRef.current === "popped" &&
				!draggingRef.current &&
				!settling.current
			) {
				shakenAt = now;
				swing = 0;
				tiltFrame.current = null;
				goDizzy();
				return;
			}

			// leaning is cosmetic, so it never interrupts a line or a drag
			if (
				modeRef.current !== "popped" ||
				draggingRef.current ||
				settling.current ||
				speechClearRef.current !== null
			) {
				return;
			}
			const abs = Math.abs(g);
			// dead band between the two thresholds so he doesn't flicker
			let want: Frame | null = null;
			if (abs > TILT_LEAN_DEG) want = g > 0 ? "leanR" : "leanL";
			else if (abs < TILT_REST_DEG) want = "front";
			if (want && want !== tiltFrame.current) {
				tiltFrame.current = want;
				setFrame(want);
			}
		};
		window.addEventListener("deviceorientation", onTilt);
		return () => {
			tiltActive.current = false;
			window.removeEventListener("deviceorientation", onTilt);
		};
	}, [reduced, coarse, tiltOn, goDizzy]);

	// ── Poke: a wave, nothing more ──
	const poke = useCallback(() => {
		if (modeRef.current === "dizzy") return;
		clearPendingSpeech();
		setWormLean(0);
		doBoing();
		setMode("popped");
		setFrame("hi");
		setLine(LINES.hi);
		speechClearRef.current = timers.later(() => {
			speechClearRef.current = null;
			if (modeRef.current === "popped") backToFront();
		}, 1600);
	}, [backToFront, clearPendingSpeech, doBoing, setWormLean, timers]);

	// ── Drag: pick him up, drop him anywhere → he lands and gets dizzy ──
	const suppressClick = useRef(false);
	const draggingRef = useRef(false);
	const dragRef = useRef<{
		pointerId: number;
		offX: number;
		offY: number;
		startX: number;
		startY: number;
		lastX: number;
		moved: boolean;
	} | null>(null);
	const endDragListeners = useRef<(() => void) | null>(null);

	// Let go → a short gravity drop with a tiny bounce, then he goes dizzy.
	const dropAndDizzy = useCallback(() => {
		settling.current = true;
		setWormLean(0);
		setFrame("front");
		const { h } = wormSize();
		const floor = Math.min(
			posRef.current.y + DROP_PX,
			window.innerHeight - h - 8,
		);
		let y = posRef.current.y;
		let vel = 0;
		let last = performance.now();
		const step = (now: number) => {
			const dt = Math.min((now - last) / 1000, 0.03);
			last = now;
			vel += 2600 * dt; // gravity
			y += vel * dt;
			if (y >= floor) {
				y = floor;
				vel = -vel * 0.32; // bounce
				if (Math.abs(vel) < 70) {
					posRef.current = { x: posRef.current.x, y: floor };
					applyPos(false);
					settling.current = false;
					goDizzy();
					return;
				}
			}
			posRef.current = { x: posRef.current.x, y };
			applyPos(false);
			timers.frame(step);
		};
		timers.frame(step);
	}, [applyPos, goDizzy, setWormLean, timers, wormSize]);

	const onPointerDown = useCallback(
		(e: React.PointerEvent<HTMLImageElement>) => {
			if (reduced || modeRef.current !== "popped" || settling.current) return;
			e.preventDefault();
			const img = imgRef.current;
			const root = rootRef.current;
			if (!img || !root) return;
			img.setPointerCapture(e.pointerId);
			draggingRef.current = true;
			dragRef.current = {
				pointerId: e.pointerId,
				offX: e.clientX - posRef.current.x,
				offY: e.clientY - posRef.current.y,
				startX: e.clientX,
				startY: e.clientY,
				lastX: e.clientX,
				moved: false,
			};
			img.style.cursor = "grabbing";

			const onMove = (ev: PointerEvent) => {
				const d = dragRef.current;
				if (!d || ev.pointerId !== d.pointerId) return;
				posRef.current = clamp(ev.clientX - d.offX, ev.clientY - d.offY);
				applyPos(false);
				const delta = ev.clientX - d.lastX;
				d.lastX = ev.clientX;
				if (Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) > 4) {
					d.moved = true;
				}
				// flop + tip toward the direction he's being flung
				if (delta < -DRAG_FLOP_AT) setFrame("flopL");
				else if (delta > DRAG_FLOP_AT) setFrame("flopR");
				else setFrame("front");
				setWormLean(Math.max(-14, Math.min(14, delta * 1.4)));
			};

			const onUp = (ev: PointerEvent) => {
				const d = dragRef.current;
				if (!d || ev.pointerId !== d.pointerId) return;
				const moved = d.moved;
				cleanup();
				if (!moved) {
					// a poke, not a drag → he waves
					poke();
					return;
				}
				draggedAt.current = Date.now();
				dropAndDizzy();
			};

			const cleanup = () => {
				suppressClick.current = true;
				draggingRef.current = false;
				dragRef.current = null;
				if (imgRef.current) imgRef.current.style.cursor = "";
				document.removeEventListener("pointermove", onMove);
				document.removeEventListener("pointerup", onUp);
				document.removeEventListener("pointercancel", onUp);
				endDragListeners.current = null;
			};
			endDragListeners.current = cleanup;
			document.addEventListener("pointermove", onMove);
			document.addEventListener("pointerup", onUp);
			document.addEventListener("pointercancel", onUp);
		},
		[reduced, clamp, applyPos, setWormLean, poke, dropAndDizzy],
	);

	useEffect(() => () => endDragListeners.current?.(), []);

	const napping = mode === "napping";
	const anchorRight =
		typeof window !== "undefined" &&
		posRef.current.x + wormSize().w / 2 > window.innerWidth / 2;
	// Near the top of the page (worst for the wordmark, the first
	// heading), there isn't room above him for the bubble, so drop it below
	// instead of letting it run up under the header.
	const bubbleBelow =
		typeof window !== "undefined" && posRef.current.y < BUBBLE_CLEARANCE_PX;

	return (
		<div
			ref={rootRef}
			className="fixed z-40 w-16 sm:w-24"
			data-testid="bagworm-parked"
		>
			{line && (
				<div
					className={
						"absolute w-60 max-w-[70vw] " +
						(bubbleBelow ? "top-full mt-2 " : "bottom-full mb-2 ") +
						(anchorRight ? "right-0" : "left-0")
					}
				>
					<Bubble
						className={anchorRight ? "ml-auto" : ""}
						tail={bubbleBelow ? "up" : "down"}
					>
						<span>{line}</span>
					</Bubble>
				</div>
			)}
			{napping && (
				<div
					aria-hidden="true"
					className="bw-zzz pointer-events-none absolute -top-1 left-2/3 text-xs font-semibold text-theme-comment"
				>
					<span>z</span>
					<span className="ml-0.5">z</span>
					<span className="ml-0.5">z</span>
				</div>
			)}
			{/* The frame box is sized for the tallest sprite (dizzy), so most of
			    the time there is dead space above him. The button gives that
			    space up: keyboard activation still works, but taps only count
			    on the sprite itself, so he stops swallowing taps meant for the
			    page underneath. */}
			<button
				type="button"
				aria-label="Bagworm, the lab mascot. Poke him and he waves."
				title="he lives here"
				onClick={() => {
					if (suppressClick.current) {
						suppressClick.current = false;
						return;
					}
					// keyboard activation, reduced-motion clicks, and clicks
					// while napping/ducked land here
					poke();
				}}
				className="pointer-events-none block w-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
			>
				<WormImage
					frame={frame}
					boing={boing}
					bob={!reduced && mode === "popped" && !settling.current}
					imgRef={imgRef}
					onPointerDown={onPointerDown}
					interactive={!reduced && mode === "popped"}
				/>
			</button>
		</div>
	);
}
