import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

// Served from the domain root, so `base` stays "/". Every asset path is root-absolute.
// Moving to a project repo means setting base to "/<repo>/", or every asset 404s.
export default defineConfig({
	base: "/",
	plugins: [react()],
})
