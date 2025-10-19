import { domListener } from "./parser/base";
import { makeDomainMatcher } from "./parser/domain-matcher";
import type { DomListener, Options, WebsiteParser } from "./parser/types";
import docsRs from "./parser/website/docs-rs";
import github from "./parser/website/github";
import google from "./parser/website/google";
import hackernews from "./parser/website/hackernews";
import mdn from "./parser/website/mdn";
import npm from "./parser/website/npm";
import reddit from "./parser/website/reddit";
import stackxxx from "./parser/website/stackxxx";
import wiki from "./parser/website/wiki";
import x from "./parser/website/x";
import youtube from "./parser/website/youtube";

let domainMatcher: ReturnType<typeof makeDomainMatcher> | null = null;
const patterns: [string, DomListener][] = [];
export const getDomListener = (domain: string, options: Options = {}) => {
	if (domainMatcher === null) {
		const parsers: WebsiteParser[] = [
			github(),
			reddit(),
			youtube(),
			mdn(),
			wiki(),
			google(),
			x(),
			stackxxx(),
			npm(),
			docsRs(),
			hackernews(),
		];

		for (const parser of parsers) {
			for (const pattern of parser.urlPatterns) {
				patterns.push([pattern, parser.domListener]);
			}
		}

		domainMatcher = makeDomainMatcher(patterns.map((p) => p[0]));
	}

	const match = domainMatcher(domain);
	if (match !== null) {
		const domListener = patterns[match][1];
		if (domListener) {
			return domListener(options);
		}
	}

	return domListener(options);
};
