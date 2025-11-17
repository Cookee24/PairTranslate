import { getNativeName } from "../constants";
import type { PageContext } from "../types";

export interface PromptContext {
	sourceLang?: string;
	targetLang: string;
	text: string | string[];
	ctx?: {
		page?: PageContext;
		surr?: {
			before?: string;
			after?: string;
		};
		[key: string]: unknown;
	};
}

export interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

type TokenBase = {
	start: number;
	end: number;
};

type StringToken = TokenBase & {
	type: "string";
	value: string;
};

type VariableToken = TokenBase & {
	type: "variable";
	name: string;
};

type ConditionalToken = TokenBase & {
	type: "conditional";
	condition: string;
	trueBranch: Token[];
	falseBranch?: Token[];
};

type LoopToken = TokenBase & {
	type: "loop";
	item: string;
	collection: string;
	body: Token[];
};

type Token = StringToken | VariableToken | ConditionalToken | LoopToken;

export class TemplateParseError extends Error {
	constructor(
		public message: string,
		public token?: Token,
	) {
		super(message);
		this.name = "TemplateParseError";
	}
}

/**
 * Template variable replacement context
 */
interface VariableContext {
	page?: Record<string, string>;
	text?: string | string[];
	surr?: {
		before?: string;
		after?: string;
	};
	lang?: {
		src?: string; // undefined if auto
		dst: string;
	};
	output?: string[];
	[key: string]: unknown;
}

export const toVariableContext = (
	promptCtx: PromptContext,
): VariableContext => {
	const varCtx: VariableContext = {
		page: promptCtx.ctx?.page,
		text: promptCtx.text,
		surr: promptCtx.ctx?.surr,
		lang: {
			src:
				promptCtx.sourceLang && promptCtx.sourceLang !== "auto"
					? getNativeName(promptCtx.sourceLang)
					: undefined,
			dst: getNativeName(promptCtx.targetLang),
		},
		...promptCtx.ctx,
	};
	return varCtx;
};

export const isEmpty = (value: unknown): boolean => {
	if (value === null || value === undefined) return true;
	if (typeof value === "string") return value.length === 0;
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === "object")
		return Object.keys(value as Record<string, unknown>).length === 0;
	return false;
};

export const templateToTokens = (template: string): Token[] => {
	const tokens: Token[] = [];
	let i = 0;

	const parseExpression = (start: number): number => {
		let depth = 1;
		let j = start;
		while (j < template.length && depth > 0) {
			if (template[j] === "{" && template[j + 1] === "{") {
				depth++;
				j += 2;
			} else if (template[j] === "}" && template[j + 1] === "}") {
				depth--;
				j += 2;
			} else {
				j++;
			}
		}
		return j;
	};

	while (i < template.length) {
		const start = i;

		// Check for escape sequences
		if (
			template[i] === "\\" &&
			template[i + 1] === "{" &&
			template[i + 2] === "{"
		) {
			tokens.push({ type: "string", value: "{{", start, end: i + 3 });
			i += 3;
			continue;
		}
		if (
			template[i] === "\\" &&
			template[i + 1] === "}" &&
			template[i + 2] === "}"
		) {
			tokens.push({ type: "string", value: "}}", start, end: i + 3 });
			i += 3;
			continue;
		}

		// Check for template syntax
		if (template[i] === "{" && template[i + 1] === "{") {
			const end = parseExpression(i + 2);
			const expr = template.slice(i + 2, end - 2).trim();

			// Conditional: {{#if CONDITION}}
			if (expr.startsWith("#if ")) {
				const condition = expr.slice(4).trim();

				// Find matching {{/if}} with proper depth tracking
				let ifEnd = -1;
				let ifDepth = 0;
				let ifSearchPos = end;

				const ifDebug = false;
				if (ifDebug) {
					console.log("\\n=== IF DEPTH TRACKING ===");
					console.log("Condition:", condition);
					console.log("Template:", template);
					console.log("Starting from position:", ifSearchPos);
				}

				while (ifSearchPos < template.length) {
					if (ifDebug && [9, 16, 26, 27, 28, 39, 54].includes(ifSearchPos)) {
						console.log(
							"  checking pos",
							ifSearchPos,
							":",
							template.slice(ifSearchPos, ifSearchPos + 7),
						);
					}
					if (template.slice(ifSearchPos, ifSearchPos + 6) === "{{#if ") {
						ifDepth++;
						if (ifDebug)
							console.log("  pos", ifSearchPos, "{{#if}} depth++", ifDepth);
						ifSearchPos += 6;
					} else if (
						template.slice(ifSearchPos, ifSearchPos + 8) === "{{#elif "
					) {
						// elif doesn't affect depth, just skip it
						if (ifDebug) console.log("  pos", ifSearchPos, "{{#elif}}");
						ifSearchPos += 8;
					} else if (
						template.slice(ifSearchPos, ifSearchPos + 7) === "{{/if}}"
					) {
						if (ifDebug)
							console.log("  pos", ifSearchPos, "{{/if}} depth=", ifDepth);
						if (ifDepth === 0) {
							if (ifDebug) console.log("  -> MATCH!");
							ifEnd = ifSearchPos;
							break;
						}
						ifDepth--;
						if (ifDebug) console.log("  -> depth--", ifDepth);
						ifSearchPos += 7;
					} else {
						ifSearchPos++;
					}
				}

				if (ifDebug) console.log("Final ifEnd:", ifEnd, "\\n");

				if (ifEnd === -1)
					throw new TemplateParseError("Unclosed {{#if}}", {
						type: "conditional",
						condition,
						trueBranch: [],
						start,
						end,
					});

				let elsePos = -1;
				let elifPos = -1;
				let depth = 0;
				let searchPos = end;

				while (searchPos < ifEnd) {
					if (template.slice(searchPos, searchPos + 6) === "{{#if ") {
						depth++;
						searchPos += 6;
					} else if (template.slice(searchPos, searchPos + 7) === "{{/if}}") {
						if (depth === 0) break;
						depth--;
						searchPos += 7;
					} else if (depth === 0) {
						if (template.slice(searchPos, searchPos + 9) === "{{#else}}") {
							elsePos = searchPos;
							searchPos += 9;
						} else if (
							template.slice(searchPos, searchPos + 8) === "{{#elif "
						) {
							elifPos = searchPos;
							break;
						} else {
							searchPos++;
						}
					} else {
						searchPos++;
					}
				}

				const branchEnd =
					elsePos !== -1 ? elsePos : elifPos !== -1 ? elifPos : ifEnd;
				const trueBranch = templateToTokens(template.slice(end, branchEnd));
				let falseBranch: Token[] | undefined;

				if (elsePos !== -1) {
					falseBranch = templateToTokens(template.slice(elsePos + 9, ifEnd));
				} else if (elifPos !== -1) {
					falseBranch = templateToTokens(template.slice(elifPos, ifEnd + 7));
				}

				tokens.push({
					type: "conditional",
					condition,
					trueBranch,
					falseBranch,
					start,
					end: ifEnd + 7,
				});
				i = ifEnd + 7;
				continue;
			}

			// Elif: {{#elif CONDITION}}
			if (expr.startsWith("#elif ")) {
				const condition = expr.slice(6).trim();

				// Find matching {{/if}} with proper depth tracking
				let ifEnd = -1;
				let ifDepth = 0;
				let ifSearchPos = end;

				while (ifSearchPos < template.length) {
					if (template.slice(ifSearchPos, ifSearchPos + 6) === "{{#if ") {
						ifDepth++;
						ifSearchPos += 6;
					} else if (
						template.slice(ifSearchPos, ifSearchPos + 7) === "{{/if}}"
					) {
						if (ifDepth === 0) {
							ifEnd = ifSearchPos;
							break;
						}
						ifDepth--;
						ifSearchPos += 7;
					} else {
						ifSearchPos++;
					}
				}

				if (ifEnd === -1)
					throw new TemplateParseError("Unclosed {{#elif}}", {
						type: "conditional",
						condition,
						trueBranch: [],
						start,
						end,
					});

				let elsePos = -1;
				let elifPos = -1;
				let depth = 0;
				let searchPos = end;

				while (searchPos < ifEnd) {
					if (template.slice(searchPos, searchPos + 7) === "{{#if ") {
						depth++;
						searchPos += 7;
					} else if (template.slice(searchPos, searchPos + 7) === "{{/if}}") {
						if (depth === 0) break;
						depth--;
						searchPos += 7;
					} else if (depth === 0) {
						if (template.slice(searchPos, searchPos + 9) === "{{#else}}") {
							elsePos = searchPos;
							searchPos += 9;
						} else if (
							template.slice(searchPos, searchPos + 8) === "{{#elif "
						) {
							elifPos = searchPos;
							break;
						} else {
							searchPos++;
						}
					} else {
						searchPos++;
					}
				}

				const branchEnd =
					elsePos !== -1 ? elsePos : elifPos !== -1 ? elifPos : ifEnd;
				const trueBranch = templateToTokens(template.slice(end, branchEnd));
				let falseBranch: Token[] | undefined;

				if (elsePos !== -1) {
					falseBranch = templateToTokens(template.slice(elsePos + 9, ifEnd));
				} else if (elifPos !== -1) {
					falseBranch = templateToTokens(template.slice(elifPos, ifEnd + 7));
				}

				tokens.push({
					type: "conditional",
					condition,
					trueBranch,
					falseBranch,
					start,
					end: ifEnd + 7,
				});
				i = ifEnd + 7;
				continue;
			}

			// Loop: {{#for ITEM:COLLECTION}}
			if (expr.startsWith("#for ")) {
				const forExpr = expr.slice(5).trim();
				const [item, collection] = forExpr.split(":").map((s) => s.trim());
				if (!item || !collection)
					throw new TemplateParseError("Invalid {{#for}} syntax", {
						type: "loop",
						item: "",
						collection: "",
						body: [],
						start,
						end,
					});

				// Find matching {{/for}} with proper depth tracking
				let forEnd = -1;
				let depth = 0;
				let searchPos = end;

				// Debug logging
				const isDebug = false;
				if (isDebug) {
					console.log("Searching for {{/for}} in template:", template);
					console.log("Starting from position:", searchPos);
					console.log("Template length:", template.length);
				}

				while (searchPos < template.length) {
					if (template.slice(searchPos, searchPos + 7) === "{{#for ") {
						depth++;
						if (isDebug) console.log("Found nested {{#for}} at", searchPos);
						searchPos += 7;
					} else if (template.slice(searchPos, searchPos + 8) === "{{/for}}") {
						if (isDebug)
							console.log("Found {{/for}} at", searchPos, "depth=", depth);
						if (depth === 0) {
							forEnd = searchPos;
							break;
						}
						depth--;
						searchPos += 8;
					} else {
						searchPos++;
					}
				}

				if (isDebug) console.log("Final forEnd:", forEnd);

				if (forEnd === -1)
					throw new TemplateParseError("Unclosed {{#for}}", {
						type: "loop",
						item,
						collection,
						body: [],
						start,
						end,
					});

				const body = templateToTokens(template.slice(end, forEnd));
				tokens.push({
					type: "loop",
					item,
					collection,
					body,
					start,
					end: forEnd + 8,
				});
				i = forEnd + 8;
				continue;
			}

			// Variable: {{variable}}
			tokens.push({ type: "variable", name: expr, start, end });
			i = end;
			continue;
		}

		// Regular string
		let str = "";
		while (
			i < template.length &&
			!(template[i] === "{" && template[i + 1] === "{") &&
			!(template[i] === "\\" && template[i + 1] === "{")
		) {
			str += template[i];
			i++;
		}
		if (str) {
			tokens.push({ type: "string", value: str, start, end: i });
		}
	}

	return tokens;
};

export const tokensToString = (
	ctx: VariableContext,
	tokens: Token[],
): string => {
	let result = "";

	const getValue = (path: string, token: Token): unknown => {
		const parts = path.split(".");
		let value: unknown = ctx;

		for (const part of parts) {
			// Handle array indexing: variable[N]
			const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
			if (arrayMatch) {
				const [, name, index] = arrayMatch;
				value = (value as Record<string, unknown>)?.[name];
				if (Array.isArray(value)) {
					value = value[Number.parseInt(index, 10)];
				} else {
					throw new TemplateParseError(`'${name}' is not an array`, token);
				}
			} else {
				value = (value as Record<string, unknown>)?.[part];
			}

			if (value === undefined) return undefined;
		}

		return value;
	};

	const evaluateCondition = (condition: string, token: Token): boolean => {
		const value = getValue(condition, token);
		return !isEmpty(value);
	};

	const processTokens = (tokenList: Token[]): string => {
		let output = "";

		for (const token of tokenList) {
			switch (token.type) {
				case "string":
					output += token.value;
					break;

				case "variable": {
					const value = getValue(token.name, token);
					if (value !== undefined && value !== null) {
						if (Array.isArray(value)) {
							output += value.join(", ");
						} else if (typeof value === "object") {
							output += JSON.stringify(value);
						} else {
							output += String(value);
						}
					}
					break;
				}

				case "conditional": {
					const conditionMet = evaluateCondition(token.condition, token);
					if (conditionMet) {
						output += processTokens(token.trueBranch);
					} else if (token.falseBranch) {
						output += processTokens(token.falseBranch);
					}
					break;
				}

				case "loop": {
					const collection = getValue(token.collection, token);
					if (Array.isArray(collection)) {
						for (let idx = 0; idx < collection.length; idx++) {
							const loopCtx: VariableContext = {
								...ctx,
								[token.item]: collection[idx],
								"@key": idx,
							};
							const savedValue = ctx[token.item as keyof VariableContext];
							const savedKey = ctx["@key" as keyof VariableContext];
							Object.assign(ctx, loopCtx);
							output += processTokens(token.body);
							// Restore original values
							if (savedValue === undefined) {
								delete ctx[token.item as keyof VariableContext];
							} else {
								ctx[token.item as keyof VariableContext] = savedValue;
							}
							if (savedKey === undefined) {
								delete ctx["@key" as keyof VariableContext];
							} else {
								ctx["@key" as keyof VariableContext] = savedKey;
							}
						}
					} else if (typeof collection === "object" && collection !== null) {
						const entries = Object.entries(
							collection as Record<string, unknown>,
						);
						for (const [key, value] of entries) {
							const loopCtx: VariableContext = {
								...ctx,
								[token.item]: value,
								"@key": key,
							};
							const savedValue = ctx[token.item as keyof VariableContext];
							const savedKey = ctx["@key" as keyof VariableContext];
							Object.assign(ctx, loopCtx);
							output += processTokens(token.body);
							// Restore original values
							if (savedValue === undefined) {
								delete ctx[token.item as keyof VariableContext];
							} else {
								ctx[token.item as keyof VariableContext] = savedValue;
							}
							if (savedKey === undefined) {
								delete ctx["@key" as keyof VariableContext];
							} else {
								ctx["@key" as keyof VariableContext] = savedKey;
							}
						}
					} else if (collection !== undefined && collection !== null) {
						throw new TemplateParseError(
							`'${token.collection}' is not iterable`,
							token,
						);
					}
					break;
				}
			}
		}

		return output;
	};

	result = processTokens(tokens);
	return result;
};
