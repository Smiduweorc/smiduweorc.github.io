// Built with `vite build --ssr` and run by scripts/prerender.ts, which writes
// one HTML file per page. Nothing here touches the disk or the DOM.

import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App";
import { allPages, headTags } from "./seo";

export { repoNames, sitemap } from "./seo";
export { FIELD_GUIDE } from "./route";

export type RenderedPage = { path: string; head: string; body: string };

export const renderPages = (): RenderedPage[] =>
	allPages().map((meta) => ({
		path: meta.path,
		head: headTags(meta),
		body: renderToString(
			<StrictMode>
				<App path={meta.path} />
			</StrictMode>,
		),
	}));
