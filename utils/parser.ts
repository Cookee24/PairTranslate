import { domListener } from "./parser/base";
import arxiv from "./parser/website/arxiv";
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
	arxiv(),
];

export const PARSER_PATTERNS = PARSER_LIST.flatMap(
	(parser) => parser.urlPatterns,
);

export const PATTERNS_IDX_TO_PARSER_IDX = PARSER_LIST.flatMap((parser, index) =>
	Array(parser.urlPatterns.length).fill(index),
);

export const DEFAULT_DOM_LISTENER = domListener;
