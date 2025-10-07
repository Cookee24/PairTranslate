import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: ["developer.mozilla.org", "*.developer.mozilla.org"],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			excludedSelectors: [...(options?.excludedSelectors || []), "header"],
		};
		return domListener(newOptions);
	},
});
