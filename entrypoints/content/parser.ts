import { DEFAULT_DOM_LISTENER, PARSER_LIST } from "~/utils/parser";
import type { ElementGenerator, Options } from "~/utils/parser/types";

let lstDomain: string | undefined;
let lstParser: ((options: Options) => ElementGenerator) | undefined;

export const getDomListener = async (
	domain: string,
	options: Options = {},
): Promise<ElementGenerator> => {
	if (domain === lstDomain && lstParser !== undefined)
		return lstParser(options);
	const idx = await window.rpc.matchParser(domain);
	const listener =
		idx === null ? DEFAULT_DOM_LISTENER : PARSER_LIST[idx].domListener;
	lstDomain = domain;
	lstParser = listener;
	return listener(options);
};
