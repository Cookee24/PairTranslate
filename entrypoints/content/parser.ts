import type { ElementGenerator, Options } from "~/utils/parser/types";

export const getDomListener = async (
	domain: string,
	options: Options = {},
): Promise<ElementGenerator> => {
	const idx = await window.rpc.matchParser(domain);
	const listener =
		idx === null ? DEFAULT_DOM_LISTENER : PARSER_LIST[idx].domListener;
	return listener(options);
};
