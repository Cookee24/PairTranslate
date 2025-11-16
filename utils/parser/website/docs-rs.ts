import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: ["docs.rs", "*.docs.rs"],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			excludedSelectors: [
				...(options?.excludedSelectors || []),
				".code-header",
				".main-heading",
				".nav-container",
				"dt",
			],
			extraTextFilters: [
				...(options?.extraTextFilters || []),
				// 'Source'
				/^Source$/,
			],
		};
		return domListener(newOptions);
	},
});
