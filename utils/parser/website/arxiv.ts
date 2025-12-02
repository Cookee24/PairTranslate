import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: ["arxiv.org", "*.arxiv.org"],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			excludedSelectors: [
				...(options?.excludedSelectors || []),
				".metatable",
				".authors",
				".extra-services",
				".target-section",
			],
		};
		return domListener(newOptions);
	},
});
