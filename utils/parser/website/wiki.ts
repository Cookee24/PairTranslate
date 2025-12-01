import { domListener } from "../base";
import type { Options, WebsiteParser } from "../types";

export default (): WebsiteParser => ({
	urlPatterns: [
		"*.wikipedia.org",
		"wikipedia.org",
		"*.wikimedia.org",
		"wikimedia.org",
		"*.wikisource.org",
		"wikisource.org",
	],
	domListener: (options) => {
		const newOptions: Options = {
			...options,
			textTags: [...(options?.textTags || []), "B", "DD"],
		};
		return domListener(newOptions);
	},
});
