// The vivarium's lighting rig. Same eight-slot palette contract the rest of
// the site is built against, so a theme is only ever a list of colours.

export type Theme = {
	id: string
	name: string
	colors: {
		bg: string
		panel: string
		border: string
		comment: string
		textSecondary: string
		text: string
		textPrimary: string
		accent: string
	}
}

export const themes: Theme[] = [
	// The house look: a dim keeper's room, one warm lamp over the glass.
	{
		id: "nightkeeper",
		name: "Night Keeper",
		colors: {
			bg: "#16150f",
			panel: "#26241c",
			border: "#3c382b",
			comment: "#988b72",
			textSecondary: "#bcaf96",
			text: "#dcd2bc",
			textPrimary: "#f7f0e1",
			accent: "#e0b04a",
		},
	},
	// Daylight through the lid: paper, ink and one red stamp.
	{
		id: "daylight",
		name: "Daylight Survey",
		colors: {
			bg: "#f5f1e8",
			panel: "#ebe4d5",
			border: "#d8cdb8",
			comment: "#655c45",
			textSecondary: "#5b5342",
			text: "#3d372a",
			textPrimary: "#241f14",
			accent: "#a83a2c",
		},
	},
	// Moss, leaf litter, and something green moving in it.
	{
		id: "moss",
		name: "Moss Terrarium",
		colors: {
			bg: "#151d17",
			panel: "#1e2a20",
			border: "#31432f",
			comment: "#6f8168",
			textSecondary: "#93a888",
			text: "#c2d3b5",
			textPrimary: "#e4efd9",
			accent: "#8fc35e",
		},
	},
	// Plain light and plain dark, for anyone who just wants the page out of
	// the way.
	{
		id: "mono-light",
		name: "Monochrome Light",
		colors: {
			bg: "#ffffff",
			panel: "#f5f5f5",
			border: "#e0e0e0",
			comment: "#9e9e9e",
			textSecondary: "#616161",
			text: "#424242",
			textPrimary: "#212121",
			accent: "#616161",
		},
	},
	{
		id: "mono-dark",
		name: "Monochrome Dark",
		colors: {
			bg: "#0a0a0a",
			panel: "#1a1a1a",
			border: "#2a2a2a",
			comment: "#4a4a4a",
			textSecondary: "#8a8a8a",
			text: "#b8b8b8",
			textPrimary: "#e8e8e8",
			accent: "#8a8a8a",
		},
	},
]

const THEME_STORAGE_KEY = "smiduweorc-theme"
const THEME_COLORS_STORAGE_KEY = "smiduweorc-theme-colors"

export function getStoredTheme(): string {
	if (typeof window === "undefined") return themes[0].id
	try {
		return localStorage.getItem(THEME_STORAGE_KEY) || themes[0].id
	} catch {
		return themes[0].id
	}
}

export function setStoredTheme(themeId: string): void {
	if (typeof window === "undefined") return
	try {
		localStorage.setItem(THEME_STORAGE_KEY, themeId)
	} catch {
		// storage unavailable; the choice still holds for this session
	}
}

export function applyTheme(theme: Theme): void {
	if (typeof document === "undefined") return

	const root = document.documentElement
	root.style.setProperty("--color-theme-bg", theme.colors.bg)
	root.style.setProperty("--color-theme-panel", theme.colors.panel)
	root.style.setProperty("--color-theme-border", theme.colors.border)
	root.style.setProperty("--color-theme-comment", theme.colors.comment)
	root.style.setProperty("--color-theme-text-secondary", theme.colors.textSecondary)
	root.style.setProperty("--color-theme-text", theme.colors.text)
	root.style.setProperty("--color-theme-text-primary", theme.colors.textPrimary)
	root.style.setProperty("--color-theme-accent", theme.colors.accent)

	// Persist the palette so the inline script in index.html can restore it
	// before first paint (no-flash theme init).
	try {
		localStorage.setItem(THEME_COLORS_STORAGE_KEY, JSON.stringify(theme.colors))
	} catch {
		// storage unavailable; the theme still applies for this session
	}

	document
		.querySelector("meta[name=\"theme-color\"]")
		?.setAttribute("content", theme.colors.bg)
}

export function initializeTheme(): Theme {
	const storedThemeId = getStoredTheme()
	const theme = themes.find(t => t.id === storedThemeId) || themes[0]
	applyTheme(theme)
	return theme
}
