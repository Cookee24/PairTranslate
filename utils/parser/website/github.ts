import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: ["*.github.com", "github.com"],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			textTags: [...(options?.textTags || []), "BDI"],
			excludedSelectors: [
				...(options?.excludedSelectors || []),
				// File name
				'[class^="react-directory-row-name-cell"]',
				// Contents above files/folders list
				'[class^="DirectoryContent-module__OverviewHeaderRow"]',
				'[class^="OverviewContent-module__Box_1-"]',
				'[class^="DirectoryContent-module__Box_2-"]',
				'[class^="DirectoryContent-module__Box_3-"]',
				// Sidebar content (except description)
				".about-margin > :not(:first-child)",
				".hide-sm.hide-md > :not(:nth-child(2))",
				// Small text of author information
				'[class^="MainContent-module__container-"]',
				// Search bar
				'[class^="SearchBar"]',
				// Issue/PR title header
				'[class^="IssueBodyHeader-module__IssueBodyHeaderContainer-"]',
				".timeline-comment-header",
				// Issue/PR toolbar
				`#${CSS.escape(":ra:-list-view-metadata")}`,
				".Box-header",
				// All sticky elements
				"#StickyHeader",
				".position-sticky",
				'[class^="Sticky"]',
				'[class^="BlobViewHeader-module"]',
				// Username
				'[data-hovercard-url^="/users/"]',
				// Code sidepanels
				".panel-content-narrow-styles",
				// Code content
				"#read-only-cursor-text-area",
				".react-code-line",
				".react-code-lines",

				'[class^="DiffFileHeader-module"]',

				'[class^="prc-PageLayout-PaneWrapper-"]',

				"#repository-container-header",
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
