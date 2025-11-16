import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: ["news.ycombinator.com", "*.news.ycombinator.com"],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			excludedSelectors: [
				...(options?.excludedSelectors || []),
				".pagetop",
				".subline",
				".comhead",
			],
		};
		return domListener(newOptions);
	},
});
