import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: ["*.github.com", "github.com"],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			textSelectors: [...(options?.textSelectors || []), "bdi"],
			excludedSelectors: [
				...(options?.excludedSelectors || []),
				// File explorer
				'[aria-labelledby="folders-and-files"]',
				// Branch info bar
				'[data-testid="branch-info-bar"]',
				// Branch selector dropdown
				'[aria-label="Select a branch"]',
				// Everything in navigation bars
				"nav",
				// Code viewer
				"#read-only-cursor-text-area",
				".react-code-line-container",
				"#symbols-pane",
				// Commit info
				'[class^="LatestCommit-module__Box"]',
				// Repository header
				"#repository-container-header:nth-child(1)",
				// File path
				'[class^="CodeViewHeader-module"]',
				'[class^="FileNameStickyHeader-module"]',
				// All sticky headers
				'[class*="StickyHeader"]',
				'[class^="StickyLinesHeader-module"]',
				'[class^="BlobViewHeader-module"]',
				".sticky-header-container",
				// File tree in repo view
				"#repos-file-tree",
				// All buttons
				"button",
				'[role="button"]',
				// Code blocks
				".highlight",
				// Text under issue titles
				'[class^="Description-module__container"]',
				// Text on issue search input
				".styled-input-container",
				// Sidebar
				".Layout-sidebar > div > div:nth-child(1) > div > div > div:nth-child(n+4)",
				".Layout-sidebar > div > div:nth-child(n+2)",
				// Issue header
				'[id^="issuecomment-"]',
				'[class^="IssueBodyHeader-module"]',
				// PR comment header
				".timeline-comment-header",
				// Issue/pr filters
				".table-list-filters",
				// PR head meta
				".gh-header-meta",
			],
			extraTextFilters: [
				...(options?.extraTextFilters || []),
				// #1234
				/^#\d+$/,
				// @username
				/^@\w+$/,
			],
		};
		return domListener(newOptions);
	},
});
