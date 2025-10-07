import type { PageContext } from "@/utils/types";

const getMetaContent = (name: string): string => {
	const meta =
		document.querySelector(`meta[name="${name}"]`) ||
		document.querySelector(`meta[property="${name}"]`) ||
		document.querySelector(`meta[property="og:${name}"]`);
	return meta?.getAttribute("content")?.trim() || "";
};

const getMetaKeywords = (): string[] => {
	const keywords = getMetaContent("keywords");
	if (!keywords) return [];
	return keywords
		.split(",")
		.map((keyword) => keyword.trim())
		.filter((keyword) => keyword.length > 0);
};

const getExtraMeta = (): Record<string, string> => {
	const extra: Record<string, string> = {};

	const usefulMetaTags = [
		"author",
		"language",
		"twitter:description",
		"og:description",
		"article:author",
		"article:published_time",
		"article:modified_time",
		"og:type",
		"og:site_name",
		"twitter:site",
	];

	for (const metaName of usefulMetaTags) {
		const content = getMetaContent(metaName);
		if (content) {
			extra[metaName] = content;
		}
	}

	return extra;
};

let cache: PageContext | undefined;
export function getPageContext(): PageContext {
	if (!cache) {
		cache = {
			pageTitle: document.title?.trim() || "",
			pageDescription: getMetaContent("description"),
			pageKeywords: getMetaKeywords(),
			domain: window.location.hostname,
			extra: getExtraMeta(),
		};
	}

	return cache;
}
