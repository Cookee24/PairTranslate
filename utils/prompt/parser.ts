/** biome-ignore-all lint/suspicious/noConstEnum: For performance */
import { getNativeName } from "~/utils/constants";

export interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

export enum ExprSegmentType {
	Identifier,
	Property,
	Index,
}

export enum TokenType {
	String,
	Variable,
	Conditional,
	Loop,
}

type TokenBase = {
	start: number;
	end: number;
};

/**
 * Represents a parsed expression that can access variables, properties, and array indices
 */
type ExprSegment =
	| { type: ExprSegmentType.Identifier; name: string }
	| { type: ExprSegmentType.Property; name: string }
	| { type: ExprSegmentType.Index; value: number };

type Expr = ExprSegment[];

type StringToken = TokenBase & {
	type: TokenType.String;
	value: string;
};

type VariableToken = TokenBase & {
	type: TokenType.Variable;
	expr: Expr;
	internalFn?: {
		name: string;
		arg?: Expr;
	};
};

type ConditionalToken = TokenBase & {
	type: TokenType.Conditional;
	condition: Expr;
	trueBranch: Token[];
	falseBranch?: Token[];
};

type LoopToken = TokenBase & {
	type: TokenType.Loop;
	item: string;
	key?: string;
	collection: Expr;
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
interface PromptContext {
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
	output?: unknown[];
	[key: string]: unknown;
}

export const buildContextWithTranslateParams = (
	ctx: PromptContext,
	lang?: { src?: string; dst: string },
	text?: string | string[],
): PromptContext => {
	const src =
		lang?.src && (lang.src !== "auto" || undefined) && getNativeName(lang.src);
	const dst = lang?.dst && getNativeName(lang.dst);
	const merged: PromptContext = {
		...ctx,
		...(dst && { lang: { src, dst } }),
		text,
	};
	return merged;
};

export const isEmpty = (value: unknown): boolean => {
	if (value === null || value === undefined) return true;
	if (typeof value === "string") return value.length === 0;
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === "object")
		return Object.keys(value as Record<string, unknown>).length === 0;
	return false;
};

/**
 * Parse a string expression into an Expr type
 * Examples:
 * - "variable" -> [{type: "identifier", name: "variable"}]
 * - "user.name" -> [{type: "identifier", name: "user"}, {type: "property", name: "name"}]
 * - "items[0]" -> [{type: "identifier", name: "items"}, {type: "index", value: 0}]
 * - "users[0].name" -> [{type: "identifier", name: "users"}, {type: "index", value: 0}, {type: "property", name: "name"}]
 */
export const parseExpr = (exprStr: string): Expr => {
	const segments: ExprSegment[] = [];
	let i = 0;

	while (i < exprStr.length) {
		// Skip whitespace
		while (i < exprStr.length && /\s/.test(exprStr[i])) {
			i++;
		}

		if (i >= exprStr.length) break;

		// Check for property access
		if (exprStr[i] === ".") {
			i++; // skip the dot
			let name = "";
			while (i < exprStr.length && /[a-zA-Z0-9_]/.test(exprStr[i])) {
				name += exprStr[i];
				i++;
			}
			if (name) {
				segments.push({ type: ExprSegmentType.Property, name });
			}
			continue;
		}

		// Check for array index
		if (exprStr[i] === "[") {
			i++; // skip the opening bracket
			let indexStr = "";
			while (i < exprStr.length && exprStr[i] !== "]") {
				indexStr += exprStr[i];
				i++;
			}
			if (i < exprStr.length && exprStr[i] === "]") {
				i++; // skip the closing bracket
				const index = Number.parseInt(indexStr.trim(), 10);
				if (!Number.isNaN(index)) {
					segments.push({ type: ExprSegmentType.Index, value: index });
				}
			}
			continue;
		}

		// Parse identifier
		let name = "";
		while (
			i < exprStr.length &&
			/[a-zA-Z0-9_]/.test(exprStr[i]) &&
			exprStr[i] !== "[" &&
			exprStr[i] !== "."
		) {
			name += exprStr[i];
			i++;
		}
		if (name) {
			segments.push({ type: ExprSegmentType.Identifier, name });
		}
	}

	return segments;
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
			tokens.push({ type: TokenType.String, value: "{{", start, end: i + 3 });
			i += 3;
			continue;
		}
		if (
			template[i] === "\\" &&
			template[i + 1] === "}" &&
			template[i + 2] === "}"
		) {
			tokens.push({ type: TokenType.String, value: "}}", start, end: i + 3 });
			i += 3;
			continue;
		}

		// Check for template syntax
		if (template[i] === "{" && template[i + 1] === "{") {
			const end = parseExpression(i + 2);
			const expr = template.slice(i + 2, end - 2).trim();

			// Conditional: {{#if CONDITION}}
			if (expr.startsWith("#if ")) {
				const conditionStr = expr.slice(4).trim();
				const condition = parseExpr(conditionStr);

				// Find matching {{/if}} with proper depth tracking
				let ifEnd = -1;
				let ifDepth = 0;
				let ifSearchPos = end;

				while (ifSearchPos < template.length) {
					if (template.slice(ifSearchPos, ifSearchPos + 6) === "{{#if ") {
						ifDepth++;
						ifSearchPos += 6;
					} else if (
						template.slice(ifSearchPos, ifSearchPos + 8) === "{{#elif "
					) {
						// elif doesn't affect depth, just skip it
						ifSearchPos += 8;
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
					throw new TemplateParseError("Unclosed {{#if}}", {
						type: TokenType.Conditional,
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
					type: TokenType.Conditional,
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
				const conditionStr = expr.slice(6).trim();
				const condition = parseExpr(conditionStr);

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
						type: TokenType.Conditional,
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
					type: TokenType.Conditional,
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
				const colonIndex = forExpr.indexOf(":");
				if (colonIndex === -1)
					throw new TemplateParseError("Invalid {{#for}} syntax", {
						type: TokenType.Loop,
						item: "",
						collection: [],
						body: [],
						start,
						end,
					});
				const itemPart = forExpr.slice(0, colonIndex).trim();
				const collectionStr = forExpr.slice(colonIndex + 1).trim();
				if (!itemPart || !collectionStr)
					throw new TemplateParseError("Invalid {{#for}} syntax", {
						type: TokenType.Loop,
						item: "",
						collection: [],
						body: [],
						start,
						end,
					});
				const parts = itemPart
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);
				if (parts.length === 0 || parts.length > 2)
					throw new TemplateParseError("Invalid loop variable declaration", {
						type: TokenType.Loop,
						item: "",
						collection: [],
						body: [],
						start,
						end,
					});
				const loopItem = parts.length === 2 ? parts[1] : parts[0];
				const loopKey = parts.length === 2 ? parts[0] : undefined;
				if (!loopItem)
					throw new TemplateParseError("Missing loop variable", {
						type: TokenType.Loop,
						item: "",
						collection: [],
						body: [],
						start,
						end,
					});
				const collection = parseExpr(collectionStr);

				// Find matching {{/for}} with proper depth tracking
				let forEnd = -1;
				let depth = 0;
				let searchPos = end;

				while (searchPos < template.length) {
					if (template.slice(searchPos, searchPos + 7) === "{{#for ") {
						depth++;
						searchPos += 7;
					} else if (template.slice(searchPos, searchPos + 8) === "{{/for}}") {
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

				if (forEnd === -1)
					throw new TemplateParseError("Unclosed {{#for}}", {
						type: TokenType.Loop,
						item: loopItem,
						collection,
						body: [],
						start,
						end,
					});

				const body = templateToTokens(template.slice(end, forEnd));
				tokens.push({
					type: TokenType.Loop,
					item: loopItem,
					key: loopKey,
					collection,
					body,
					start,
					end: forEnd + 8,
				});
				i = forEnd + 8;
				continue;
			}

			// Variable or internal function
			if (expr.startsWith("@")) {
				const [fn, argExpr] = expr.split(/\s+/, 2);
				if (!fn)
					throw new TemplateParseError("Missing internal function name", {
						type: TokenType.Variable,
						expr: [],
						start,
						end,
					});
				tokens.push({
					type: TokenType.Variable,
					expr: [],
					internalFn: {
						name: fn,
						arg: argExpr ? parseExpr(argExpr) : undefined,
					},
					start,
					end,
				});
			} else {
				tokens.push({
					type: TokenType.Variable,
					expr: parseExpr(expr),
					start,
					end,
				});
			}
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
			tokens.push({ type: TokenType.String, value: str, start, end: i });
		}
	}

	return tokens;
};

export const tokensToString = (ctx: PromptContext, tokens: Token[]): string => {
	let result = "";

	const getValue = (expr: Expr, token: Token): unknown => {
		let value: unknown = ctx;

		for (const segment of expr) {
			if (segment.type === ExprSegmentType.Identifier) {
				value = (value as Record<string, unknown>)?.[segment.name];
			} else if (segment.type === ExprSegmentType.Property) {
				value = (value as Record<string, unknown>)?.[segment.name];
			} else if (segment.type === ExprSegmentType.Index) {
				if (Array.isArray(value)) {
					value = value[segment.value];
				} else {
					const exprStr = expr
						.map((s) =>
							s.type === ExprSegmentType.Identifier ||
							s.type === ExprSegmentType.Property
								? s.name
								: `[${s.value}]`,
						)
						.join(".");
					throw new TemplateParseError(`'${exprStr}' is not an array`, token);
				}
			}

			if (value === undefined) return undefined;
		}

		return value;
	};

	const evaluateCondition = (condition: Expr, token: Token): boolean => {
		const value = getValue(condition, token);
		return !isEmpty(value);
	};

	const processTokens = (tokenList: Token[]): string => {
		const stringifyValue = (
			value: unknown,
			token: Token,
			space?: number,
		): string => {
			try {
				const serialized = JSON.stringify(value, null, space);
				return serialized ?? "null";
			} catch (error) {
				throw new TemplateParseError(
					`Failed to stringify value: ${(error as Error).message}`,
					token,
				);
			}
		};
		const callInternal = (token: VariableToken): string => {
			if (!token.internalFn) return "";
			const argValue = token.internalFn.arg
				? getValue(token.internalFn.arg, token)
				: undefined;
			switch (token.internalFn.name) {
				case "@toJSON":
					return stringifyValue(argValue, token);
				case "@toJSONPretty":
					return stringifyValue(argValue, token, 2);
				default:
					throw new TemplateParseError(
						`Unknown internal function ${token.internalFn.name}`,
						token,
					);
			}
		};
		let output = "";

		for (const token of tokenList) {
			switch (token.type) {
				case TokenType.String:
					output += token.value;
					break;

				case TokenType.Variable: {
					if (token.internalFn) {
						output += callInternal(token);
						break;
					}
					const resolved = getValue(token.expr, token);
					if (resolved !== undefined && resolved !== null) {
						if (Array.isArray(resolved)) {
							output += resolved.join(", ");
						} else if (typeof resolved === "object") {
							output += stringifyValue(resolved, token);
						} else {
							output += String(resolved);
						}
					}
					break;
				}

				case TokenType.Conditional: {
					const conditionMet = evaluateCondition(token.condition, token);
					if (conditionMet) {
						output += processTokens(token.trueBranch);
					} else if (token.falseBranch) {
						output += processTokens(token.falseBranch);
					}
					break;
				}

				case TokenType.Loop: {
					const collection = getValue(token.collection, token);
					const iterate = (
						entries: Iterable<[string | number, unknown]>,
					): void => {
						for (const [key, value] of entries) {
							const savedValue = ctx[token.item as keyof PromptContext];
							const savedKey = token.key
								? ctx[token.key as keyof PromptContext]
								: undefined;
							ctx[token.item as keyof PromptContext] = value;
							if (token.key) ctx[token.key as keyof PromptContext] = key;
							output += processTokens(token.body);
							if (savedValue === undefined) {
								delete ctx[token.item as keyof PromptContext];
							} else {
								ctx[token.item as keyof PromptContext] = savedValue;
							}
							if (token.key) {
								if (savedKey === undefined) {
									delete ctx[token.key as keyof PromptContext];
								} else {
									ctx[token.key as keyof PromptContext] = savedKey;
								}
							}
						}
					};
					if (Array.isArray(collection)) {
						iterate(collection.map((value, idx) => [idx, value] as const));
					} else if (typeof collection === "object" && collection !== null) {
						iterate(Object.entries(collection as Record<string, unknown>));
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
