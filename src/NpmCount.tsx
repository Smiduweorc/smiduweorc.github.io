import { formatWeekly, useWeeklyDownloads } from "./downloads";
import type { Specimen } from "./specimens";

/** Last week's npm downloads, as catalogue data. Renders nothing until the
 *  count arrives, and nothing at all for a specimen that is not on npm. */
export function NpmCount({
	specimen,
	className = "",
}: {
	specimen: Specimen;
	className?: string;
}) {
	const n = useWeeklyDownloads(specimen);
	if (n === null) return null;
	return (
		<span
			className={"whitespace-nowrap font-mono " + className}
			title={`${n.toLocaleString("en")} npm downloads last week`}
		>
			↓ {formatWeekly(n)} (npm)
		</span>
	);
}
