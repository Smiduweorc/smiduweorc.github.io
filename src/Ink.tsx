// Hand-drawn ink accents. Drawn inline so they inherit currentColor and
// stretch with whatever they are underlining.

export function InkUnderline({ className = "" }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 180 12"
			preserveAspectRatio="none"
			className={"block h-2.5 w-40 max-w-full " + className}
			fill="none"
		>
			<path
				d="M3 8.2 C 24 4.1, 43 3.2, 62 5.4 C 80 7.5, 96 9.6, 115 7.3 C 134 5.1, 156 3.4, 177 6.2"
				stroke="currentColor"
				strokeWidth="2.6"
				strokeLinecap="round"
			/>
			<path
				d="M14 10.4 C 40 7.6, 70 8.9, 96 9.8"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				opacity="0.55"
			/>
		</svg>
	);
}

export function InkSquiggle({ className = "" }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 120 14"
			preserveAspectRatio="none"
			className={"block h-3 w-24 " + className}
			fill="none"
		>
			<path
				d="M3 7 C 9 1, 15 1, 21 7 C 27 13, 33 13, 39 7 C 45 1, 51 1, 57 7 C 63 13, 69 13, 75 7 C 81 1, 87 1, 93 7 C 99 13, 105 13, 111 7"
				stroke="currentColor"
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
		</svg>
	);
}
