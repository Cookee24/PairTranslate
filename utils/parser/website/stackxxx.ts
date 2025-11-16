import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: [
		"stackoverflow.com",
		"*.stackoverflow.com",
		"stackexchange.com",
		"*.stackexchange.com",
	],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			excludedSelectors: [
				...(options?.excludedSelectors || []),
				// Search bar
				'form[id="search"]',
				// Statistics under question title
				"#question-header + div",
				// Comment author
				'[itemprop="author"]',
				// Comment time
				".comment-date",
				// Navigation
				"nav",
			],
		};
		return domListener(newOptions);
	},
});
