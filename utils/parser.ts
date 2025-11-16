import { domListener } from "./parser/base";
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

export const PARSER_LIST = [
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

export const PARSER_PATTERNS = PARSER_LIST.flatMap(
	(parser) => parser.urlPatterns,
);

export const LISTENER_FROM_PATTERN_INDEX = PARSER_LIST.flatMap((parser) =>
	parser.urlPatterns.map(() => parser.domListener),
);

export const DEFAULT_DOM_LISTENER = domListener;
