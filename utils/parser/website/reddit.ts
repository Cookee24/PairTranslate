import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: ["reddit.com", "*.reddit.com"],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			excludedSelectors: [
				...(options?.excludedSelectors || []),
				// Code blocks
				"pre",
				// Sidebar
				"reddit-sidebar-nav",
				// Comments action buttons
				"shreddit-comment-action-row",
				// Top bar
				"#pdp-credit-bar",
				// Username & metadata
				'[slot="commentMeta"]',
				'[slot="credit-bar"]',
				// Some buttons
				'faceplate-tracker[noun="comment_author_avatar"]',
				'faceplate-tracker[noun="right_rail_auth"]',
				'faceplate-partial[loading="action"]',
				"faceplate-dropdown-menu",
				// Time
				"faceplate-timeago",
				// More comments
				'[id^="comments-permalink"]',
			],
			extraTextFilters: [
				// r/*
				/^r\/\w+$/,
				// u/*
				/^u\/\w+$/,
			],
		};
		return domListener(newOptions);
	},
});
