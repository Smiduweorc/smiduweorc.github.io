import { StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
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

const root = document.getElementById("root")!
const app = (
	<StrictMode>
		<App path={location.pathname} />
	</StrictMode>
)

// The built site ships each page already rendered and this picks it up. The
// dev server serves an empty root, so there it renders from nothing.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
