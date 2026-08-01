import { useEffect, useRef, useState } from "react"
import { themes, type Theme, applyTheme, setStoredTheme } from "./theme"

interface SettingsButtonProps {
	currentTheme: Theme
	onThemeChange: (theme: Theme) => void
}

export function SettingsButton({ currentTheme, onThemeChange }: SettingsButtonProps) {
	const [isOpen, setIsOpen] = useState(false)
	const panelRef = useRef<HTMLDivElement>(null)

	// Escape closes the shelf; without it the only way out is a click, which
	// is awkward when the thing was opened from the keyboard.
	useEffect(() => {
		if (!isOpen) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false)
		}
		document.addEventListener("keydown", onKey)
		return () => document.removeEventListener("keydown", onKey)
	}, [isOpen])

	const handleThemeSelect = (theme: Theme) => {
		applyTheme(theme)
		setStoredTheme(theme.id)
		onThemeChange(theme)
		setIsOpen(false)
	}

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				title="Vivarium lighting (themes)"
				className="flex h-12 w-12 items-center justify-center rounded-full border border-theme-border bg-theme-panel/80 text-theme-text shadow-lg backdrop-blur-sm transition hover:bg-theme-panel hover:shadow-xl"
			>
				<svg
					className="h-5 w-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				<span className="sr-only">Vivarium lighting</span>
			</button>

			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>
					<div
						ref={panelRef}
						className="absolute bottom-16 right-0 z-50 max-h-[70vh] w-72 rounded-lg border border-theme-border bg-theme-panel p-4 shadow-xl"
					>
						<h3 className="font-display mb-1 text-lg text-theme-text-primary">
							Vivarium lighting
						</h3>
						<p className="mb-3 text-xs leading-snug text-theme-comment">
							Pick whichever is kindest to your eyes.
						</p>
						<div className="max-h-[calc(70vh-7rem)] space-y-2 overflow-y-auto pr-1">
							{themes.map((theme) => (
								<button
									key={theme.id}
									type="button"
									onClick={() => handleThemeSelect(theme)}
									aria-pressed={currentTheme.id === theme.id}
									className={`w-full rounded-md border p-2.5 text-left transition ${
										currentTheme.id === theme.id
											? "border-theme-accent bg-theme-accent/10 text-theme-text-primary"
											: "border-theme-border bg-transparent text-theme-text hover:bg-theme-border/30"
									}`}
								>
									<span className="flex items-center gap-3">
										<span className="flex h-6 w-9 shrink-0 overflow-hidden rounded border border-theme-border">
											<span
												className="h-full w-1/3"
												style={{ backgroundColor: theme.colors.bg }}
											/>
											<span
												className="h-full w-1/3"
												style={{ backgroundColor: theme.colors.panel }}
											/>
											<span
												className="h-full w-1/3"
												style={{ backgroundColor: theme.colors.accent }}
											/>
										</span>
										<span className="text-sm font-medium">{theme.name}</span>
									</span>
								</button>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	)
}
