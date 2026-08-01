/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				"theme-bg": "var(--color-theme-bg)",
				"theme-panel": "var(--color-theme-panel)",
				"theme-border": "var(--color-theme-border)",
				"theme-comment": "var(--color-theme-comment)",
				"theme-text-secondary": "var(--color-theme-text-secondary)",
				"theme-text": "var(--color-theme-text)",
				"theme-text-primary": "var(--color-theme-text-primary)",
				"theme-accent": "var(--color-theme-accent)",
			},
		},
	},
	plugins: [],
}