import { getContentStyles } from "@/utils/css";
import type { StyleService } from "~/utils/rpc";

type CssPair = [documentCss: string, shadowCss: string];
export const createStyleService = (): StyleService => {
	const promise = getContentStyles();
	return {
		getContentStyles: (): Promise<CssPair> => promise,
	};
};
