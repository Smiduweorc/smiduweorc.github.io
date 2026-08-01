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
			bg: "#1b1a15",
			panel: "#26241c",
			border: "#3c382b",
			comment: "#867a64",
			textSecondary: "#a89b83",
			text: "#cabfa8",
			textPrimary: "#f0e7d4",
			accent: "#c7a04a",
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
			comment: "#7b7259",
			textSecondary: "#5b5342",
			text: "#3d372a",
			textPrimary: "#241f14",
			accent: "#a83a2c",
		},
	},
	// Under the UV lamp, which is when the interesting things come out.
	{
		id: "uv",
		name: "UV Lamp",
		colors: {
			bg: "#14101f",
			panel: "#1e1830",
			border: "#332a4d",
			comment: "#6b5f8f",
			textSecondary: "#9c8ec4",
			text: "#cfc4ea",
			textPrimary: "#ece5ff",
			accent: "#9d7bff",
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
	{
		id: "tokyo",
		name: "Tokyo Night",
		colors: {
			bg: "#1a1b26",
			panel: "#24283b",
			border: "#414868",
			comment: "#565f89",
			textSecondary: "#9aa5ce",
			text: "#a9b1d6",
			textPrimary: "#bdc7f0",
			accent: "#7aa2f7",
		},
	},
	{
		id: "nord",
		name: "Nord",
		colors: {
			bg: "#2e3440",
			panel: "#3b4252",
			border: "#4c566a",
			comment: "#616e88",
			textSecondary: "#81a1c1",
			text: "#d8dee9",
			textPrimary: "#eceff4",
			accent: "#88c0d0",
		},
	},
	{
		id: "dracula",
		name: "Dracula",
		colors: {
			bg: "#282a36",
			panel: "#383a59",
			border: "#6272a4",
			comment: "#6272a4",
			textSecondary: "#bd93f9",
			text: "#f8f8f2",
			textPrimary: "#ffffff",
			accent: "#ff79c6",
		},
	},
	{
		id: "catppuccin",
		name: "Catppuccin Mocha",
		colors: {
			bg: "#1e1e2e",
			panel: "#313244",
			border: "#45475a",
			comment: "#6c7086",
			textSecondary: "#a6adc8",
			text: "#cdd6f4",
			textPrimary: "#f5e0dc",
			accent: "#89b4fa",
		},
	},
	{
		id: "gruvbox",
		name: "Gruvbox Dark",
		colors: {
			bg: "#282828",
			panel: "#3c3836",
			border: "#504945",
			comment: "#665c54",
			textSecondary: "#a89984",
			text: "#ebdbb2",
			textPrimary: "#fbf1c7",
			accent: "#fabd2f",
		},
	},
	{
		id: "everforest",
		name: "Everforest Dark",
		colors: {
			bg: "#2d353b",
			panel: "#343f44",
			border: "#475258",
			comment: "#859289",
			textSecondary: "#9da9a0",
			text: "#d3c6aa",
			textPrimary: "#e6e2cc",
			accent: "#a7c080",
		},
	},
	{
		id: "rose-pine",
		name: "Rosé Pine",
		colors: {
			bg: "#191724",
			panel: "#1f1d2e",
			border: "#403d52",
			comment: "#6e6a86",
			textSecondary: "#908caa",
			text: "#e0def4",
			textPrimary: "#f6f4ff",
			accent: "#eb6f92",
		},
	},
	{
		id: "solarized",
		name: "Solarized Dark",
		colors: {
			bg: "#002b36",
			panel: "#073642",
			border: "#586e75",
			comment: "#657b83",
			textSecondary: "#839496",
			text: "#93a1a1",
			textPrimary: "#eee8d5",
			accent: "#2aa198",
		},
	},
	{
		id: "one-dark",
		name: "One Dark",
		colors: {
			bg: "#282c34",
			panel: "#2c323c",
			border: "#3e4451",
			comment: "#5c6370",
			textSecondary: "#828997",
			text: "#abb2bf",
			textPrimary: "#c8ccd4",
			accent: "#61afef",
		},
	},
	{
		id: "pastel-pink-dark",
		name: "Pastel Pink Dark",
		colors: {
			bg: "#1a1420",
			panel: "#2d1b2e",
			border: "#4a3347",
			comment: "#6b506b",
			textSecondary: "#c5a4c5",
			text: "#f4d4f4",
			textPrimary: "#ffeeff",
			accent: "#e991d8",
		},
	},
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
