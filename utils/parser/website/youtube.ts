import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: ["youtu.be", "youtube.com", "*.youtube.com"],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			excludedSelectors: [
				...(options?.excludedSelectors || []),
				// Search box
				"yt-searchbox",
				".ytSearchboxComponentSuggestionsContainer",
				// Video metadata
				"#metadata-line",
				"yt-content-metadata-view-model",
				// Player
				"#player",
				// Comment actions
				"ytd-comment-engagement-bar",
				"tp-yt-paper-button",
				// Video actions/metadata
				"#top-row",
				"#info-container",
				// Channel links
				'a[aria-label^="YouTube Channel Link"]',
				// Sidebar
				"ytd-mini-guide-renderer",
				// Logo
				"#logo",
				// Username
				"#byline-container",
				// All buttons
				"ytd-button-renderer",
				// Video thumbnails
				"yt-thumbnail-view-model",
				// Advertisements
				"ytd-in-feed-ad-layout-renderer",
			],
			extraTextFilters: [
				// Hashtags
				/^#\S+/,
				// @usernames
				/^@\S+/,
			],
		};
		return domListener(newOptions);
	},
});
