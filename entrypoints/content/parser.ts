import type { ElementGenerator, Options } from "~/utils/parser/types";

export const getDomListener = async (
	domain: string,
	options: Options = {},
): Promise<ElementGenerator> => {
	const idx = await window.rpc.matchParser(domain);
	const listener =
		idx === null ? DEFAULT_DOM_LISTENER : LISTENER_FROM_PATTERN_INDEX[idx];
	console.log("Using listener index:", idx);
	return listener(options);
};
