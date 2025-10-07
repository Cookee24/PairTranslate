import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: ["google.com", "www.google.com"],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			excludedSelectors: [
				...(options?.excludedSelectors || []),
				// Search bar
				'form[class="tsf"]',
				'[data-st-tgt="fb"]',
				// Footer
				"#footcnt",
			],
		};
		return domListener(newOptions);
	},
});
