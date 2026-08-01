import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
// The four typographic jobs: display / body / catalogue mono / hand.
import "@fontsource-variable/fraunces/index.css"
import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/500.css"
import "@fontsource/ibm-plex-sans/600.css"
import "@fontsource/ibm-plex-sans/700.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/600.css"
import "@fontsource-variable/shantell-sans/index.css"
import "./index.css"
import App from "./App.tsx"
import { initializeTheme } from "./theme"

// Ahead of the first render, so nothing paints in the fallback palette.
initializeTheme()

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
