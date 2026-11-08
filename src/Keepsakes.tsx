// Pressed into the journal's margins. All aria-hidden: nothing in them to read.

function Tape({ className = "" }: { className?: string }) {
	return (
		<span
			aria-hidden="true"
			className={"absolute h-4 w-12 bg-theme-comment/30 " + className}
		/>
	);
}

export function PressedLeaf({ className = "" }: { className?: string }) {
	return (
		<div aria-hidden="true" className={"relative w-28 rotate-[14deg] " + className}>
			<svg viewBox="0 0 100 140" className="block w-full text-theme-comment" fill="none">
				<path
					d="M50 132 C 50 120, 50 112, 50 104 C 20 92, 6 62, 14 34 C 22 12, 42 6, 50 4 C 58 6, 78 12, 86 34 C 94 62, 80 92, 50 104"
					fill="currentColor"
					fillOpacity="0.12"
					stroke="currentColor"
					strokeWidth="1.6"
					strokeLinejoin="round"
				/>
				<path d="M50 104 C 50 80, 50 40, 50 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
				{[
					"M50 86 C 40 80, 30 74, 22 64",
					"M50 86 C 60 80, 70 74, 78 64",
					"M50 66 C 40 60, 30 52, 22 42",
					"M50 66 C 60 60, 70 52, 78 42",
					"M50 46 C 42 40, 36 32, 30 22",
					"M50 46 C 58 40, 64 32, 70 22",
				].map((d) => (
					<path key={d} d={d} stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
				))}
			</svg>
			<Tape className="bottom-1 left-1/2 -translate-x-1/2 -rotate-[20deg]" />
		</div>
	);
}

export function CoffeeRing({ className = "" }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 120 120"
			className={"pointer-events-none text-theme-comment " + className}
			fill="none"
		>
			<path
				d="M60 8 C 90 7, 113 30, 112 60 C 111 90, 88 113, 58 112 C 30 111, 8 90, 9 60 C 10 34, 28 12, 52 9"
				stroke="currentColor"
				strokeWidth="5"
				strokeLinecap="round"
				opacity="0.18"
			/>
			<path
				d="M62 14 C 88 15, 106 34, 106 60 C 106 86, 86 106, 60 106"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				opacity="0.25"
			/>
		</svg>
	);
}

export function Frond({ className = "" }: { className?: string }) {
	const pairs = [0, 1, 2, 3, 4, 5, 6];
	return (
		<div aria-hidden="true" className={"relative w-16 -rotate-[10deg] " + className}>
			<svg viewBox="0 0 60 150" className="block w-full text-theme-comment" fill="none">
				<path d="M30 146 C 30 110, 28 60, 32 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
				{pairs.map((i) => {
					const y = 128 - i * 17;
					const reach = 22 - i * 2.6;
					return (
						<g key={i} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="currentColor" fillOpacity="0.1">
							<path d={`M30 ${y} C ${30 - reach * 0.6} ${y - 4}, ${30 - reach} ${y - 10}, ${30 - reach} ${y - 14} C ${30 - reach * 0.5} ${y - 12}, 30 ${y - 8}, 30 ${y}`} />
							<path d={`M30 ${y} C ${30 + reach * 0.6} ${y - 4}, ${30 + reach} ${y - 10}, ${30 + reach} ${y - 14} C ${30 + reach * 0.5} ${y - 12}, 30 ${y - 8}, 30 ${y}`} />
						</g>
					);
				})}
			</svg>
			<Tape className="bottom-6 left-1/2 w-10 -translate-x-1/2 rotate-[8deg]" />
		</div>
	);
}

export function Feather({ className = "" }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 60 160"
			className={"block w-12 rotate-[24deg] text-theme-comment " + className}
			fill="none"
		>
			<path
				d="M30 152 C 30 120, 30 60, 32 8 C 46 22, 52 54, 48 86 C 46 104, 38 118, 31 126 C 22 116, 12 100, 12 78 C 12 50, 20 24, 32 8"
				fill="currentColor"
				fillOpacity="0.1"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinejoin="round"
			/>
			{[30, 46, 62, 78, 94, 110].map((y) => (
				<path key={y} d={`M31 ${y} L 44 ${y - 10} M31 ${y + 4} L 17 ${y - 6}`} stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
			))}
			<path d="M38 70 L 46 64" stroke="currentColor" strokeWidth="1" opacity="0.5" />
		</svg>
	);
}

export function AntTracks({ className = "" }: { className?: string }) {
	const steps = Array.from({ length: 14 }, (_, i) => i);
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 280 40"
			className={"pointer-events-none text-theme-comment " + className}
			fill="currentColor"
		>
			{steps.map((i) => {
				const x = 8 + i * 19;
				const y = 20 + Math.sin(i * 0.7) * 8;
				return (
					<g key={i} opacity={0.15 + (i / steps.length) * 0.3}>
						<circle cx={x} cy={y - 4} r="1.6" />
						<circle cx={x + 6} cy={y + 4} r="1.6" />
					</g>
				);
			})}
		</svg>
	);
}

export function Dirt({ className = "" }: { className?: string }) {
	const crumbs: [number, number, number][] = [
		[18, 40, 2.2], [26, 52, 1.4], [70, 30, 1.8], [84, 46, 1.2], [60, 70, 2.4],
		[40, 78, 1.3], [92, 64, 1.6], [12, 66, 1.1], [100, 36, 1], [50, 22, 1.2],
	];
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 120 100"
			className={"pointer-events-none block w-28 text-theme-comment " + className}
			fill="currentColor"
		>
			<path
				d="M34 30 C 48 18, 74 20, 84 34 C 94 48, 86 66, 66 70 C 48 74, 30 66, 26 52 C 23 42, 27 36, 34 30 Z"
				opacity="0.12"
			/>
			{[0, 1, 2, 3].map((i) => (
				<path
					key={i}
					d={`M${38 + i * 4} ${44 - i * 3} C ${50} ${34 - i * 3}, ${66} ${36 - i * 2}, ${74 - i * 2} ${48 - i}`}
					fill="none"
					stroke="currentColor"
					strokeWidth="1"
					opacity="0.18"
				/>
			))}
			{crumbs.map(([x, y, r]) => (
				<circle key={`${x}-${y}`} cx={x} cy={y} r={r} opacity="0.35" />
			))}
		</svg>
	);
}

export function TapeScrap({ className = "", angle = -12 }: { className?: string; angle?: number }) {
	return (
		<span
			aria-hidden="true"
			className={"block h-5 w-16 bg-theme-comment/25 " + className}
			style={{
				rotate: `${angle}deg`,
				// torn ends, not cut ones
				clipPath: "polygon(4% 0, 96% 8%, 100% 40%, 94% 100%, 2% 92%, 0 50%)",
			}}
		/>
	);
}

export function LongLeaf({ className = "" }: { className?: string }) {
	return (
		<div aria-hidden="true" className={"relative w-14 -rotate-[28deg] " + className}>
			<svg viewBox="0 0 40 150" className="block w-full text-theme-comment" fill="none">
				<path
					d="M20 146 C 18 120, 8 80, 10 44 C 12 22, 18 8, 22 4 C 28 20, 32 50, 30 84 C 28 112, 22 130, 20 146"
					fill="currentColor"
					fillOpacity="0.12"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinejoin="round"
				/>
				<path d="M20 140 C 19 100, 18 50, 21 10" stroke="currentColor" strokeWidth="1" opacity="0.6" />
			</svg>
			<Tape className="left-1/2 top-1/3 w-9 -translate-x-1/2 rotate-[70deg]" />
		</div>
	);
}
