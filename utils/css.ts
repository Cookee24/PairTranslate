export const getContentStyles = async (): Promise<
	[documentCss: string, shadowCss: string]
> => {
	let shadowCss = (await import("~/assets/shadow.css?inline")).default;
	let documentCss = "";
	const pos = [];
	const pattern = "@property";

	for (let i = 0; i < shadowCss.length; i++) {
		i = shadowCss.indexOf(pattern, i);
		if (i === -1) break;
		const l = i;
		i += pattern.length;
		while (true) {
			while (i + 1 < shadowCss.length && shadowCss[i] !== "}") i++;
			while (
				i + 1 < shadowCss.length &&
				(shadowCss[i + 1] === " " ||
					shadowCss[i + 1] === "\n" ||
					shadowCss[i + 1] === "\t")
			)
				i++;
			if (
				shadowCss[i + 1] === "@" &&
				shadowCss.slice(i + 1, i + 1 + pattern.length) === pattern
			) {
				i += pattern.length + 1;
			} else {
				break;
			}
		}
		const r = i + 1;
		pos.push([l, r]);
	}

	for (let i = pos.length - 1; i >= 0; i--) {
		const [l, r] = pos[i];
		documentCss += shadowCss.slice(l, r);
	}

	for (let i = pos.length - 1; i >= 0; i--) {
		const [l, r] = pos[i];
		shadowCss = shadowCss.slice(0, l) + shadowCss.slice(r);
	}

	return [documentCss, shadowCss];
};
