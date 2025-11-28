import type { PageContext } from "./types";

const getMetaContent = (name: string): string => {
	const meta =
		document.querySelector(`meta[name="${name}"]`) ||
		document.querySelector(`meta[property="${name}"]`) ||
		document.querySelector(`meta[property="og:${name}"]`) ||
		document.querySelector(`meta[itemprop="${name}"]`);
	return meta?.getAttribute("content")?.trim() || "";
};

const getMetaKeywords = (): string[] => {
	const content = getMetaContent("keywords");
	if (!content) return [];
	return content
		.split(/,|，/)
		.map((k) => k.trim())
		.filter((k) => k.length > 0);
};

const getMainHeading = (): string => {
	const h1 = document.querySelector("h1");
	return h1?.innerText?.trim() || "";
};

const getExtraMeta = (): Record<string, string> => {
	const extra: Record<string, string> = {};

	const usefulMetaTags = [
		"description",
		"author",
		"og:site_name",
		"og:type",
		"article:section",
		"article:tag",
	];

	for (const name of usefulMetaTags) {
		const content = getMetaContent(name);
		if (content) {
			const key = name.replace(/^og:|article:/, "");
			extra[key] = content;
		}
	}

	return extra;
};

let cache: PageContext | undefined;
let lastUrl: string;

export function getPageContext(): PageContext {
	const currentUrl = window.location.href;

	// 简单的缓存验证
	if (lastUrl !== currentUrl) {
		lastUrl = currentUrl;
		cache = undefined;
	}

	if (!cache) {
		const rawTitle = document.title.trim();
		const mainHeading = getMainHeading();

		const cleanTitle =
			mainHeading && rawTitle.includes(mainHeading) ? mainHeading : rawTitle;

		cache = {
			url: currentUrl,
			domain: window.location.hostname,
			title: cleanTitle,
			h1: mainHeading,
			keywords: getMetaKeywords().join(", "),
			...getExtraMeta(),
		};
	}

	return cache;
}
