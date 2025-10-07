import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: ["x.com", "*.x.com", "twitter.com", "*.twitter.com"],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			excludedSelectors: [
				...(options?.excludedSelectors || []),
				// Interaction buttons under tweets
				"button[data-testid]",
				"article a[href$=analytics]",
				// Navigation
				"nav",
				// Tab bars
				'div[role="tablist"]',
				// Username
				'div[data-testid="UserName"]',
				// Top nav bar
				"main > div > div > div > div:nth-child(1) > div > div:nth-child(1)",
				// Floating bottom bar
				"#layers",
				// Time
				"time",
			],
		};
		return domListener(newOptions);
	},
});
