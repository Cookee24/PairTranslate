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

export enum TemplateErrorCode {
	IncompleteExpression = "INCOMPLETE_EXPRESSION",
	UnexpectedToken = "UNEXPECTED_TOKEN",
	UnknownDirective = "UNKNOWN_DIRECTIVE",
	UnclosedBlock = "UNCLOSED_BLOCK",
	InvalidLoopDeclaration = "INVALID_LOOP_DECLARATION",
	InvalidExpression = "INVALID_EXPRESSION",
	InvalidIndex = "INVALID_INDEX",
	UnknownInternalFunction = "UNKNOWN_INTERNAL_FUNCTION",
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
	code: TemplateErrorCode;
	token?: Token;
	position?: number;

	constructor(
		public message: string,
		options: {
			code: TemplateErrorCode;
			token?: Token;
			position?: number;
		},
	) {
		super(message);
		this.code = options.code;
		this.token = options.token;
		this.position = options.position;
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
export const parseExpr = (exprStr: string, offset = 0): Expr => {
	const segments: ExprSegment[] = [];
	let i = 0;
	const length = exprStr.length;

	const isWhitespace = (char: string | undefined): boolean =>
		!!char && /\s/.test(char);
	const isIdentifierChar = (char: string | undefined): boolean =>
		!!char && /[a-zA-Z0-9_]/.test(char);

	const skipWhitespace = (): void => {
		while (i < length && isWhitespace(exprStr[i])) {
			i++;
		}
	};

	const readIdentifier = (): string => {
		let name = "";
		while (i < length && isIdentifierChar(exprStr[i])) {
			name += exprStr[i];
			i++;
		}
		return name;
	};

	skipWhitespace();
	while (i < length) {
		if (segments.length === 0) {
			const name = readIdentifier();
			if (!name) {
				throw new TemplateParseError("Expected identifier", {
					code: TemplateErrorCode.InvalidExpression,
					position: offset + i,
				});
			}
			segments.push({ type: ExprSegmentType.Identifier, name });
			skipWhitespace();
			continue;
		}

		const char = exprStr[i];
		if (char === ".") {
			i++;
			skipWhitespace();
			const name = readIdentifier();
			if (!name) {
				throw new TemplateParseError("Expected property name after '.'", {
					code: TemplateErrorCode.InvalidExpression,
					position: offset + i,
				});
			}
			segments.push({ type: ExprSegmentType.Property, name });
			skipWhitespace();
			continue;
		}

		if (char === "[") {
			const bracketStart = i;
			i++;
			let indexStr = "";
			while (i < length && exprStr[i] !== "]") {
				indexStr += exprStr[i];
				i++;
			}
			if (i >= length) {
				throw new TemplateParseError("Unclosed index accessor", {
					code: TemplateErrorCode.IncompleteExpression,
					position: offset + bracketStart,
				});
			}
			const trimmedIndex = indexStr.trim();
			if (!trimmedIndex) {
				throw new TemplateParseError("Missing array index", {
					code: TemplateErrorCode.InvalidIndex,
					position: offset + bracketStart + 1,
				});
			}
			const index = Number.parseInt(trimmedIndex, 10);
			if (Number.isNaN(index)) {
				throw new TemplateParseError(`Invalid array index '${trimmedIndex}'`, {
					code: TemplateErrorCode.InvalidIndex,
					position: offset + bracketStart + 1,
				});
			}
			segments.push({ type: ExprSegmentType.Index, value: index });
			i++; // skip closing bracket
			skipWhitespace();
			continue;
		}

		if (isWhitespace(char)) {
			skipWhitespace();
			continue;
		}

		throw new TemplateParseError(
			`Unexpected character '${char}' in expression`,
			{
				code: TemplateErrorCode.UnexpectedToken,
				position: offset + i,
			},
		);
	}

	if (segments.length === 0) {
		throw new TemplateParseError("Empty expression", {
			code: TemplateErrorCode.InvalidExpression,
			position: offset,
		});
	}

	return segments;
};

export const exprToString = (expr: Expr): string => {
	let result = "";
	for (const segment of expr) {
		if (
			segment.type === ExprSegmentType.Identifier ||
			segment.type === ExprSegmentType.Property
		) {
			if (result) {
				result += `.${segment.name}`;
			} else {
				result += segment.name;
			}
		} else {
			result += `[${segment.value}]`;
		}
	}
	return result;
};

type ControlTagType = "#if" | "#elif" | "#for";

enum StopType {
	Else = "ELSE",
	Elif = "ELIF",
	EndIf = "END_IF",
	EndFor = "END_FOR",
}

type Tag = {
	start: number;
	end: number;
	raw: string;
	inner: string;
};

type StopInfo =
	| { type: StopType.Else; tag: Tag }
	| { type: StopType.Elif; tag: Tag }
	| { type: StopType.EndIf; tag: Tag }
	| { type: StopType.EndFor; tag: Tag };

export const templateToTokens = (template: string): Token[] => {
	const readTag = (start: number): Tag => {
		let index = start + 2;
		while (index < template.length) {
			if (template[index] === "}" && template[index + 1] === "}") {
				const raw = template.slice(start + 2, index);
				return {
					start,
					end: index + 2,
					raw,
					inner: raw.trim(),
				};
			}
			index++;
		}
		throw new TemplateParseError("Unclosed template expression", {
			code: TemplateErrorCode.IncompleteExpression,
			position: start,
		});
	};

	const describeStop = (type: StopType): string => {
		switch (type) {
			case StopType.Else:
				return "{{#else}}";
			case StopType.Elif:
				return "{{#elif}}";
			case StopType.EndIf:
				return "{{/if}}";
			case StopType.EndFor:
				return "{{/for}}";
		}
	};

	const detectStopTag = (tag: Tag): StopInfo | undefined => {
		const trimmed = tag.inner;
		if (trimmed.startsWith("#else")) {
			const extra = trimmed.slice("#else".length).trim();
			if (extra.length > 0) {
				throw new TemplateParseError("Unexpected content in {{#else}}", {
					code: TemplateErrorCode.UnexpectedToken,
					position: tag.start,
				});
			}
			return { type: StopType.Else, tag };
		}
		if (trimmed.startsWith("#elif")) {
			return { type: StopType.Elif, tag };
		}
		if (trimmed === "/if") {
			return { type: StopType.EndIf, tag };
		}
		if (trimmed === "/for") {
			return { type: StopType.EndFor, tag };
		}
		return undefined;
	};

	const extractKeywordArgument = (
		tag: Tag,
		keyword: ControlTagType,
	): { argument: string; offset: number } => {
		const raw = tag.raw;
		let index = 0;
		while (index < raw.length && /\s/.test(raw[index])) {
			index++;
		}
		if (!raw.startsWith(keyword, index)) {
			throw new TemplateParseError(`Expected ${keyword} directive`, {
				code: TemplateErrorCode.UnknownDirective,
				position: tag.start + 2 + index,
			});
		}
		index += keyword.length;
		if (index >= raw.length || !/\s/.test(raw[index])) {
			throw new TemplateParseError(`Expected whitespace after ${keyword}`, {
				code: TemplateErrorCode.InvalidExpression,
				position: tag.start + 2 + index,
			});
		}
		while (index < raw.length && /\s/.test(raw[index])) {
			index++;
		}
		const argument = raw.slice(index);
		if (!argument.trim()) {
			throw new TemplateParseError(`Missing expression after ${keyword}`, {
				code: TemplateErrorCode.InvalidExpression,
				position: tag.start + 2 + index,
			});
		}
		return {
			argument,
			offset: tag.start + 2 + index,
		};
	};

	const parseTokens = (
		start: number,
		stopTypes: StopType[] = [],
	): {
		tokens: Token[];
		index: number;
		stop?: StopInfo;
	} => {
		const tokens: Token[] = [];
		let i = start;

		while (i < template.length) {
			const isEscapedOpen =
				template[i] === "\\" &&
				template[i + 1] === "{" &&
				template[i + 2] === "{";
			if (isEscapedOpen) {
				tokens.push({
					type: TokenType.String,
					value: "{{",
					start: i,
					end: i + 3,
				});
				i += 3;
				continue;
			}

			const isTagStart = template[i] === "{" && template[i + 1] === "{";

			if (isTagStart) {
				const tag = readTag(i);
				const stopMatch = detectStopTag(tag);
				if (stopMatch) {
					if (stopTypes.includes(stopMatch.type)) {
						return { tokens, index: tag.end, stop: stopMatch };
					}
					throw new TemplateParseError(
						`Unexpected ${describeStop(stopMatch.type)} tag`,
						{
							code: TemplateErrorCode.UnexpectedToken,
							position: tag.start,
						},
					);
				}

				const { token, index } = parseTag(tag);
				tokens.push(token);
				i = index;
				continue;
			}

			const textStart = i;
			while (
				i < template.length &&
				!(template[i] === "{" && template[i + 1] === "{") &&
				!(
					template[i] === "\\" &&
					template[i + 1] === "{" &&
					template[i + 2] === "{"
				)
			) {
				i++;
			}
			if (i > textStart) {
				tokens.push({
					type: TokenType.String,
					value: template.slice(textStart, i),
					start: textStart,
					end: i,
				});
			}
		}

		if (stopTypes.length > 0) {
			throw new TemplateParseError(
				`Missing ${stopTypes.map(describeStop).join(" or ")}`,
				{
					code: TemplateErrorCode.UnclosedBlock,
					position: template.length,
				},
			);
		}

		return { tokens, index: template.length };
	};

	const parseLoop = (tag: Tag): { token: LoopToken; index: number } => {
		const { argument, offset } = extractKeywordArgument(tag, "#for");
		const colonIndex = argument.indexOf(":");
		if (colonIndex === -1) {
			throw new TemplateParseError("Missing ':' in {{#for}} declaration", {
				code: TemplateErrorCode.InvalidLoopDeclaration,
				position: offset,
			});
		}

		const variablePart = argument.slice(0, colonIndex);
		const collectionPart = argument.slice(colonIndex + 1);
		if (!collectionPart.trim()) {
			throw new TemplateParseError("Missing iterable expression in {{#for}}", {
				code: TemplateErrorCode.InvalidLoopDeclaration,
				position: offset + colonIndex + 1,
			});
		}

		const identifiers = variablePart
			.split(",")
			.map((part) => part.trim())
			.filter(Boolean);
		if (identifiers.length === 0 || identifiers.length > 2) {
			throw new TemplateParseError("Invalid loop variable declaration", {
				code: TemplateErrorCode.InvalidLoopDeclaration,
				position: offset,
			});
		}

		const validateIdentifier = (name: string): void => {
			if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
				throw new TemplateParseError(`Invalid loop variable '${name}'`, {
					code: TemplateErrorCode.InvalidLoopDeclaration,
					position: offset,
				});
			}
		};

		if (identifiers.length === 2) {
			validateIdentifier(identifiers[0]);
			validateIdentifier(identifiers[1]);
		} else {
			validateIdentifier(identifiers[0]);
		}

		const loopItem = identifiers.length === 2 ? identifiers[1] : identifiers[0];
		const loopKey = identifiers.length === 2 ? identifiers[0] : undefined;
		const collection = parseExpr(collectionPart, offset + colonIndex + 1);

		const body = parseTokens(tag.end, [StopType.EndFor]);
		if (!body.stop || body.stop.type !== StopType.EndFor) {
			throw new TemplateParseError("Unclosed {{#for}} block", {
				code: TemplateErrorCode.UnclosedBlock,
				position: tag.start,
			});
		}

		return {
			token: {
				type: TokenType.Loop,
				item: loopItem,
				key: loopKey,
				collection,
				body: body.tokens,
				start: tag.start,
				end: body.stop.tag.end,
			},
			index: body.index,
		};
	};

	const parseConditional = (
		tag: Tag,
		keyword: "#if" | "#elif" = "#if",
	): { token: ConditionalToken; index: number } => {
		const { argument, offset } = extractKeywordArgument(tag, keyword);
		const condition = parseExpr(argument, offset);
		const branch = parseTokens(tag.end, [
			StopType.Elif,
			StopType.Else,
			StopType.EndIf,
		]);

		if (!branch.stop) {
			throw new TemplateParseError(`Unclosed {{${keyword}}} block`, {
				code: TemplateErrorCode.UnclosedBlock,
				position: tag.start,
			});
		}

		let falseBranch: Token[] | undefined;
		let nextIndex = branch.index;
		let end = branch.stop.tag.end;

		if (branch.stop.type === StopType.Else) {
			const elseBranch = parseTokens(branch.index, [StopType.EndIf]);
			if (!elseBranch.stop || elseBranch.stop.type !== StopType.EndIf) {
				throw new TemplateParseError("Unclosed {{#if}} block", {
					code: TemplateErrorCode.UnclosedBlock,
					position: tag.start,
				});
			}
			falseBranch = elseBranch.tokens;
			nextIndex = elseBranch.index;
			end = elseBranch.stop.tag.end;
		} else if (branch.stop.type === StopType.Elif) {
			const nested = parseConditional(branch.stop.tag, "#elif");
			falseBranch = [nested.token];
			nextIndex = nested.index;
			end = nested.token.end;
		}

		return {
			token: {
				type: TokenType.Conditional,
				condition,
				trueBranch: branch.tokens,
				falseBranch,
				start: tag.start,
				end,
			},
			index: nextIndex,
		};
	};

	const parseInternalFunction = (tag: Tag): VariableToken => {
		const raw = tag.raw;
		let index = 0;
		while (index < raw.length && /\s/.test(raw[index])) {
			index++;
		}
		if (raw[index] !== "@") {
			throw new TemplateParseError("Missing internal function name", {
				code: TemplateErrorCode.InvalidExpression,
				position: tag.start + 2 + index,
			});
		}
		let name = "@";
		index++;
		while (index < raw.length && !/\s/.test(raw[index])) {
			name += raw[index];
			index++;
		}
		if (name === "@") {
			throw new TemplateParseError("Missing internal function name", {
				code: TemplateErrorCode.InvalidExpression,
				position: tag.start + 2 + index,
			});
		}
		while (index < raw.length && /\s/.test(raw[index])) {
			index++;
		}
		const argStr = raw.slice(index);
		const argExpr =
			argStr.trim().length > 0
				? parseExpr(argStr, tag.start + 2 + index)
				: undefined;

		return {
			type: TokenType.Variable,
			expr: [],
			internalFn: {
				name,
				arg: argExpr,
			},
			start: tag.start,
			end: tag.end,
		};
	};

	const parseTag = (tag: Tag): { token: Token; index: number } => {
		const trimmed = tag.inner;
		if (!trimmed) {
			throw new TemplateParseError("Empty template expression", {
				code: TemplateErrorCode.InvalidExpression,
				position: tag.start,
			});
		}

		if (trimmed.startsWith("#if")) {
			return parseConditional(tag);
		}

		if (trimmed.startsWith("#for")) {
			return parseLoop(tag);
		}

		if (trimmed.startsWith("#elif") || trimmed.startsWith("#else")) {
			throw new TemplateParseError(
				`Unexpected ${trimmed.startsWith("#elif") ? "{{#elif}}" : "{{#else}}"} tag`,
				{
					code: TemplateErrorCode.UnexpectedToken,
					position: tag.start,
				},
			);
		}

		if (trimmed === "/if" || trimmed === "/for") {
			throw new TemplateParseError(
				`Unexpected ${trimmed === "/if" ? "{{/if}}" : "{{/for}}"} tag`,
				{
					code: TemplateErrorCode.UnexpectedToken,
					position: tag.start,
				},
			);
		}

		if (trimmed.startsWith("#")) {
			throw new TemplateParseError(`Unknown directive '${trimmed}'`, {
				code: TemplateErrorCode.UnknownDirective,
				position: tag.start,
			});
		}

		if (trimmed.startsWith("@")) {
			return { token: parseInternalFunction(tag), index: tag.end };
		}

		return {
			token: {
				type: TokenType.Variable,
				expr: parseExpr(tag.raw, tag.start + 2),
				start: tag.start,
				end: tag.end,
			},
			index: tag.end,
		};
	};

	return parseTokens(0).tokens;
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
					throw new TemplateParseError(
						`'${exprToString(expr)}' is not an array`,
						{
							code: TemplateErrorCode.InvalidExpression,
							token,
						},
					);
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
					{
						code: TemplateErrorCode.InvalidExpression,
						token,
					},
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
						{
							code: TemplateErrorCode.UnknownInternalFunction,
							token,
						},
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
							`'${exprToString(token.collection)}' is not iterable`,
							{
								code: TemplateErrorCode.InvalidExpression,
								token,
							},
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
