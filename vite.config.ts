import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

// Deployed to https://smiduweorc.github.io/ from the repo `Smiduweorc.github.io`,
// so the site sits at the domain root and `base` stays "/". If this ever moves
// back to a project repo (github.io/<repo>/), set base to "/<repo>/", because every
// asset path in the app is root-absolute and would 404 otherwise.
export default defineConfig({
	base: "/",
	plugins: [react()],
})
