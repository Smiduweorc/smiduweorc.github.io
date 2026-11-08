import { formatWeekly, useWeeklyDownloads } from "./downloads";
import type { Specimen } from "./specimens";

/** Renders nothing until the count arrives, or for a specimen not on npm. */
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
			{formatWeekly(n)} (npm)
		</span>
	);
}
