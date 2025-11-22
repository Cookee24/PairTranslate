import { describe, expect, test } from "bun:test";
import {
	ExprSegmentType,
	isEmpty,
	TemplateParseError,
	TokenType,
	templateToTokens,
	tokensToString,
} from "./parser";

describe("isEmpty", () => {
	test("returns true for null and undefined", () => {
		expect(isEmpty(null)).toBe(true);
		expect(isEmpty(undefined)).toBe(true);
	});

	test("returns true for empty string", () => {
		expect(isEmpty("")).toBe(true);
	});

	test("returns false for non-empty string", () => {
		expect(isEmpty("hello")).toBe(false);
		expect(isEmpty(" ")).toBe(false);
	});

	test("returns true for empty array", () => {
		expect(isEmpty([])).toBe(true);
	});

	test("returns false for non-empty array", () => {
		expect(isEmpty([1, 2, 3])).toBe(false);
		expect(isEmpty([""])).toBe(false);
	});

	test("returns true for empty object", () => {
		expect(isEmpty({})).toBe(true);
	});

	test("returns false for non-empty object", () => {
		expect(isEmpty({ a: 1 })).toBe(false);
	});

	test("returns false for primitives", () => {
		expect(isEmpty(0)).toBe(false);
		expect(isEmpty(false)).toBe(false);
		expect(isEmpty(true)).toBe(false);
	});
});


describe("intoTokens", () => {
	describe("basic tokens", () => {
		test("parses plain text", () => {
			const tokens = templateToTokens("Hello World");
			expect(tokens).toEqual([
				{
					type: TokenType.String,
					value: "Hello World",
					start: 0,
					end: 11,
				} as any,
			]);
		});

		test("parses simple variable", () => {
			const tokens = templateToTokens("{{name}}");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe(TokenType.Variable);
			if (tokens[0].type === TokenType.Variable) {
				expect(tokens[0].expr).toEqual([
					{ type: ExprSegmentType.Identifier, name: "name" },
				]);
			}
		});
		test("parses text with variables", () => {
			const tokens = templateToTokens("Hello {{name}}!");
			expect(tokens).toHaveLength(3);
			expect(tokens[0]).toMatchObject({
				type: TokenType.String,
				value: "Hello ",
			});
			expect(tokens[1]).toMatchObject({
				type: TokenType.Variable,
				expr: [{ type: ExprSegmentType.Identifier, name: "name" }],
			});
			expect(tokens[2]).toMatchObject({ type: TokenType.String, value: "!" });
		});
		test("parses nested property access", () => {
			const tokens = templateToTokens("{{user.name}}");
			expect(tokens[0]).toMatchObject({
				type: TokenType.Variable,
				expr: [
					{ type: ExprSegmentType.Identifier, name: "user" },
					{ type: ExprSegmentType.Property, name: "name" },
				],
			});
		});
		test("parses array indexing", () => {
			const tokens = templateToTokens("{{items[0]}}");
			expect(tokens[0]).toMatchObject({
				type: TokenType.Variable,
				expr: [
					{ type: ExprSegmentType.Identifier, name: "items" },
					{ type: ExprSegmentType.Index, value: 0 },
				],
			});
		});
	});

	describe("escape sequences", () => {
		test("parses escaped opening braces", () => {
			const tokens = templateToTokens("\\{{not a variable}}");
			expect(tokens).toHaveLength(2);
			expect(tokens[0]).toMatchObject({ type: TokenType.String, value: "{{" });
			expect(tokens[1]).toMatchObject({
				type: TokenType.String,
				value: "not a variable}}",
			});
		});

		test("parses escaped closing braces", () => {
			const tokens = templateToTokens("test \\}} end");
			// Note: escaped closing braces are not currently parsed separately
			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: TokenType.String,
				value: "test \\}} end",
			});
		});
	});

	describe("conditional tokens", () => {
		test("parses simple if statement", () => {
			const tokens = templateToTokens("{{#if condition}}true{{/if}}");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe(TokenType.Conditional);
			if (tokens[0].type === TokenType.Conditional) {
				expect(tokens[0].condition).toEqual([
					{ type: ExprSegmentType.Identifier, name: "condition" },
				]);
				expect(tokens[0].trueBranch).toHaveLength(1);
				expect(tokens[0].falseBranch).toBeUndefined();
			}
		});
		test("parses if-else statement", () => {
			const tokens = templateToTokens(
				"{{#if condition}}true{{#else}}false{{/if}}",
			);
			if (tokens[0].type === TokenType.Conditional) {
				expect(tokens[0].condition).toEqual([
					{ type: ExprSegmentType.Identifier, name: "condition" },
				]);
				expect(tokens[0].trueBranch).toHaveLength(1);
				expect(tokens[0].falseBranch).toHaveLength(1);
			}
		});

		test("parses if-elif-else chain", () => {
			const tokens = templateToTokens(
				"{{#if a}}A{{#elif b}}B{{#else}}C{{/if}}",
			);
			if (tokens[0].type === TokenType.Conditional) {
				expect(tokens[0].condition).toEqual([
					{ type: ExprSegmentType.Identifier, name: "a" },
				]);
				if (tokens[0].trueBranch[0].type === TokenType.String) {
					expect(tokens[0].trueBranch[0].value).toBe("A");
				}
				expect(tokens[0].falseBranch).toBeDefined();
			}
		});
		test("parses nested conditionals", () => {
			// Nested conditionals are now supported
			const tokens = templateToTokens(
				"{{#if outer}}{{#if inner}}nested{{/if}}{{/if}}",
			);
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe(TokenType.Conditional);
			if (tokens[0].type === TokenType.Conditional) {
				expect(tokens[0].condition).toEqual([
					{ type: ExprSegmentType.Identifier, name: "outer" },
				]);
				expect(tokens[0].trueBranch).toHaveLength(1);
				expect(tokens[0].trueBranch[0].type).toBe(TokenType.Conditional);
			}
		});
		test("throws on unclosed if", () => {
			expect(() => templateToTokens("{{#if condition}}true")).toThrow(
				TemplateParseError,
			);
		});

		test("parses empty if block", () => {
			const tokens = templateToTokens("{{#if condition}}{{/if}}");
			expect(tokens).toHaveLength(1);
			if (tokens[0].type === TokenType.Conditional) {
				expect(tokens[0].condition).toEqual([
					{ type: ExprSegmentType.Identifier, name: "condition" } as any,
				]);
				expect(tokens[0].trueBranch).toHaveLength(0);
			}
		});
		test("handles whitespace in conditionals", () => {
			const tokens = templateToTokens("{{ #if  condition  }}true{{/if}}");
			expect(tokens).toHaveLength(1);
			if (tokens[0].type === TokenType.Conditional) {
				expect(tokens[0].condition).toEqual([
					{ type: ExprSegmentType.Identifier, name: "condition" },
				]);
			}
		});
	});

	describe("loop tokens", () => {
		test("parses simple for loop", () => {
			const tokens = templateToTokens("{{#for item:items}}{{item}}{{/for}}");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe(TokenType.Loop);
			if (tokens[0].type === TokenType.Loop) {
				expect(tokens[0].item).toBe("item");
				expect(tokens[0].collection).toEqual([
					{ type: ExprSegmentType.Identifier, name: "items" },
				]);
				expect(tokens[0].body).toHaveLength(1);
			}
		});
		test("parses loop with text", () => {
			const tokens = templateToTokens(
				"{{#for item:items}}Item: {{item}}{{/for}}",
			);
			if (tokens[0].type === TokenType.Loop) {
				expect(tokens[0].body).toHaveLength(2);
				if (tokens[0].body[0].type === TokenType.String) {
					expect(tokens[0].body[0].value).toBe("Item: ");
				}
			}
		});

		test("throws on invalid for syntax", () => {
			expect(() => templateToTokens("{{#for invalid}}{{/for}}")).toThrow(
				TemplateParseError,
			);
		});

		test("throws on unclosed for", () => {
			expect(() => templateToTokens("{{#for item:items}}body")).toThrow(
				TemplateParseError,
			);
		});

		test("parses empty for loop", () => {
			const tokens = templateToTokens("{{#for item:items}}{{/for}}");
			expect(tokens).toHaveLength(1);
			if (tokens[0].type === TokenType.Loop) {
				expect(tokens[0].item).toBe("item");
				expect(tokens[0].collection).toEqual([
					{ type: ExprSegmentType.Identifier, name: "items" } as any,
				]);
				expect(tokens[0].body).toHaveLength(0);
			}
		});
		test("handles whitespace in loop syntax", () => {
			const tokens = templateToTokens("{{ #for  item : items  }}body{{/for}}");
			expect(tokens).toHaveLength(1);
			if (tokens[0].type === TokenType.Loop) {
				expect(tokens[0].item).toBe("item");
				expect(tokens[0].collection).toEqual([
					{ type: ExprSegmentType.Identifier, name: "items" },
				]);
			}
		});
	});

	describe("complex templates", () => {
		test("parses mixed content", () => {
			const template = "Hello {{name}}! {{#if age}}Age: {{age}}{{/if}}";
			const tokens = templateToTokens(template);
			expect(tokens.length).toBeGreaterThan(0);
			expect(tokens.some((t) => t.type === TokenType.String)).toBe(true);
			expect(tokens.some((t) => t.type === TokenType.Variable)).toBe(true);
			expect(tokens.some((t) => t.type === TokenType.Conditional)).toBe(true);
		});

		test("parses nested structures", () => {
			const template =
				"{{#for item:items}}{{#if item.active}}{{item.name}}{{/if}}{{/for}}";
			const tokens = templateToTokens(template);
			expect(tokens).toHaveLength(1);
			if (tokens[0].type === TokenType.Loop) {
				expect(tokens[0].body[0].type).toBe(TokenType.Conditional);
			}
		});
	});

	describe("malformed expressions", () => {
		test("throws on unclosed elif", () => {
			expect(() => templateToTokens("{{#elif condition}}true")).toThrow(
				TemplateParseError,
			);
		});

		test("throws on mismatched closing tags", () => {
			expect(() => templateToTokens("{{#if condition}}true{{/for}}")).toThrow(
				TemplateParseError,
			);
		});

		test("handles whitespace in variable names", () => {
			const tokens = templateToTokens("{{  variable  }}");
			expect(tokens).toHaveLength(1);
			if (tokens[0].type === TokenType.Variable) {
				expect(tokens[0].expr).toEqual([
					{ type: ExprSegmentType.Identifier, name: "variable" },
				]);
			}
		});
		test("handles multiple consecutive variables", () => {
			const tokens = templateToTokens("{{a}}{{b}}{{c}}");
			expect(tokens).toHaveLength(3);
			expect(tokens.every((t) => t.type === TokenType.Variable)).toBe(true);
		});

		test("handles empty template", () => {
			const tokens = templateToTokens("");
			expect(tokens).toHaveLength(0);
		});
	});
});

describe("serializeToString", () => {
	describe("basic serialization", () => {
		test("serializes plain text", () => {
			const tokens = templateToTokens("Hello World");
			const ctx = { lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("Hello World");
		});

		test("serializes simple variable", () => {
			const tokens = templateToTokens("{{name}}");
			const ctx = { name: "Alice", lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("Alice");
		});

		test("serializes nested property", () => {
			const tokens = templateToTokens("{{user.name}}");
			const ctx = { user: { name: "Bob" }, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("Bob");
		});

		test("serializes array indexing", () => {
			const tokens = templateToTokens("{{items[0]}}");
			const ctx = { items: ["first", "second"], lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("first");
		});

		test("handles undefined variables gracefully", () => {
			const tokens = templateToTokens("{{missing}}");
			const ctx = { lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});

		test("serializes arrays as comma-separated", () => {
			const tokens = templateToTokens("{{tags}}");
			const ctx = { tags: ["a", "b", "c"], lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("a, b, c");
		});

		test("serializes objects as JSON", () => {
			const tokens = templateToTokens("{{data}}");
			const ctx = { data: { x: 1, y: 2 }, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe('{"x":1,"y":2}');
		});

		test("handles deeply nested property access", () => {
			const tokens = templateToTokens("{{a.b.c}}");
			const ctx = { a: { b: { c: "deep" } }, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("deep");
		});

		test("handles nested array access", () => {
			const tokens = templateToTokens("{{items[0].name}}");
			const ctx = {
				items: [{ name: "First" }, { name: "Second" }],
				lang: { dst: "English" },
			};
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("First");
		});

		test("handles out-of-bounds array access", () => {
			const tokens = templateToTokens("{{items[99]}}");
			const ctx = { items: ["a", "b"], lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});

		test("serializes number values", () => {
			const tokens = templateToTokens("{{count}}");
			const ctx = { count: 42, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("42");
		});

		test("serializes zero", () => {
			const tokens = templateToTokens("{{value}}");
			const ctx = { value: 0, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("0");
		});

		test("serializes boolean true", () => {
			const tokens = templateToTokens("{{flag}}");
			const ctx = { flag: true, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("true");
		});

		test("serializes boolean false", () => {
			const tokens = templateToTokens("{{flag}}");
			const ctx = { flag: false, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("false");
		});
	});

	describe("conditional serialization", () => {
		test("renders true branch when condition is truthy", () => {
			const tokens = templateToTokens("{{#if show}}visible{{/if}}");
			const ctx = { show: true, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("visible");
		});

		test("renders nothing when condition is falsy", () => {
			const tokens = templateToTokens("{{#if show}}visible{{/if}}");
			// Note: boolean false is not considered empty, use undefined/null/empty string/array
			const ctx = { show: undefined, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});

		test("renders false branch when provided", () => {
			const tokens = templateToTokens(
				"{{#if show}}visible{{#else}}hidden{{/if}}",
			);
			// Note: boolean false is not considered empty, use undefined/null/empty string/array
			const ctx = { show: undefined, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("hidden");
		});

		test("evaluates conditions based on isEmpty", () => {
			const tokens = templateToTokens("{{#if items}}has items{{/if}}");

			expect(
				tokensToString({ items: [], lang: { dst: "English" } }, tokens),
			).toBe("");
			expect(
				tokensToString({ items: [1, 2], lang: { dst: "English" } }, tokens),
			).toBe("has items");
			expect(
				tokensToString({ items: "", lang: { dst: "English" } }, tokens),
			).toBe("");
			expect(
				tokensToString({ items: "text", lang: { dst: "English" } }, tokens),
			).toBe("has items");
		});

		test("handles elif chain", () => {
			const tokens = templateToTokens(
				"{{#if a}}A{{#elif b}}B{{#else}}C{{/if}}",
			);

			// Note: boolean false is not considered empty, use undefined/null/empty string/array
			expect(
				tokensToString(
					{ a: "value", b: undefined, lang: { dst: "English" } },
					tokens,
				),
			).toBe("A");
			expect(
				tokensToString(
					{ a: undefined, b: "value", lang: { dst: "English" } },
					tokens,
				),
			).toBe("B");
			expect(
				tokensToString(
					{ a: undefined, b: undefined, lang: { dst: "English" } },
					tokens,
				),
			).toBe("C");
		});

		test("handles nested property in condition", () => {
			const tokens = templateToTokens("{{#if user.active}}Active{{/if}}");
			const ctx = { user: { active: true }, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("Active");
		});

		test("handles empty nested property in condition", () => {
			const tokens = templateToTokens("{{#if user.name}}Has name{{/if}}");
			const ctx = { user: { name: "" }, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});
	});

	describe("loop serialization", () => {
		test("iterates over array", () => {
			const tokens = templateToTokens("{{#for item:items}}{{item}} {{/for}}");
			const ctx = { items: ["a", "b", "c"], lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("a b c ");
		});

		test("provides access to loop key when declared", () => {
			const tokens = templateToTokens(
				"{{#for idx, item:items}}{{idx}}: {{item}} {{/for}}",
			);
			const ctx = { items: ["a", "b"], lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("0: a 1: b ");
		});

		test("iterates over object properties", () => {
			const tokens = templateToTokens(
				"{{#for key, val:obj}}{{key}}={{val}} {{/for}}",
			);
			const ctx = { obj: { x: 1, y: 2 }, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toContain("x=1");
			expect(result).toContain("y=2");
		});

		test("handles empty collections", () => {
			const tokens = templateToTokens("{{#for item:items}}{{item}}{{/for}}");
			const ctx = { items: [], lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});

		test("handles undefined collections", () => {
			const tokens = templateToTokens("{{#for item:items}}{{item}}{{/for}}");
			const ctx = { lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});

		test("throws on non-iterable collection", () => {
			const tokens = templateToTokens("{{#for item:items}}{{item}}{{/for}}");
			const ctx = { items: 123, lang: { dst: "English" } };
			expect(() => tokensToString(ctx, tokens)).toThrow(TemplateParseError);
		});

		test("throws on boolean collection", () => {
			const tokens = templateToTokens("{{#for item:items}}{{item}}{{/for}}");
			const ctx = { items: true, lang: { dst: "English" } };
			expect(() => tokensToString(ctx, tokens)).toThrow(TemplateParseError);
		});

		test("handles null collection gracefully", () => {
			const tokens = templateToTokens("{{#for item:items}}{{item}}{{/for}}");
			const ctx = { items: null, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});

		test("handles loop with object properties", () => {
			const tokens = templateToTokens(
				"{{#for item:items}}{{item.id}} {{/for}}",
			);
			const ctx = {
				items: [{ id: 1 }, { id: 2 }],
				lang: { dst: "English" },
			};
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("1 2 ");
		});

		test("preserves context after loop", () => {
			const tokens = templateToTokens(
				"{{item}}|{{#for item:items}}{{item}}{{/for}}|{{item}}",
			);
			const ctx = {
				item: "original",
				items: ["a", "b"],
				lang: { dst: "English" },
			};
			const result = tokensToString(ctx, tokens);
			// After loop, item should be restored to "original"
			expect(result).toBe("original|ab|original");
		});

		test("handles nested array in loop", () => {
			const tokens = templateToTokens(
				"{{#for list:lists}}{{list[0]}} {{/for}}",
			);
			const ctx = {
				lists: [
					["a", "b"],
					["c", "d"],
				],
				lang: { dst: "English" },
			};
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("a c ");
		});

		test("handles nested loops", () => {
			// Nested loops are now supported
			const tokens = templateToTokens(
				"{{#for outer:outers}}{{#for inner:outer.inners}}{{inner}} {{/for}}{{/for}}",
			);
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe(TokenType.Loop);
			if (tokens[0].type === TokenType.Loop) {
				expect(tokens[0].item).toBe("outer");
				expect(tokens[0].body).toHaveLength(1);
				expect(tokens[0].body[0].type).toBe(TokenType.Loop);
			}
		});
	});

	describe("complex scenarios", () => {
		test("combines conditionals and loops", () => {
			const tokens = templateToTokens(
				"{{#for item:items}}{{#if item.active}}{{item.name}} {{/if}}{{/for}}",
			);
			const ctx = {
				items: [
					{ name: "A", active: true },
					{ name: "B", active: false },
					{ name: "C", active: true },
				],
				lang: { dst: "English" },
			};
			const result = tokensToString(ctx, tokens);
			// Note: boolean false is not considered empty, so all items are shown
			expect(result).toBe("A B C ");
		});

		test("handles text interpolation", () => {
			const tokens = templateToTokens(
				"Translate {{text}} from {{lang.src}} to {{lang.dst}}",
			);
			const ctx = {
				text: "Hello",
				lang: { src: "English", dst: "Spanish" },
			};
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("Translate Hello from English to Spanish");
		});

		test("handles missing optional fields", () => {
			const tokens = templateToTokens(
				"{{#if lang.src}}From {{lang.src}} to {{/if}}{{lang.dst}}",
			);
			const ctx = { lang: { dst: "Spanish" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("Spanish");
		});

		test("processes page context", () => {
			const tokens = templateToTokens(
				"{{#if page}}Page: {{page.title}} ({{page.domain}}){{/if}}",
			);
			const ctx = {
				page: { title: "Test", domain: "example.com" },
				lang: { dst: "English" },
			};
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("Page: Test (example.com)");
		});

		test("processes array text field", () => {
			const tokens = templateToTokens(
				"{{#for idx, item:text}}{{idx}}. {{item}}\n{{/for}}",
			);
			const ctx = {
				text: ["First", "Second", "Third"],
				lang: { dst: "English" },
			};
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("0. First\n1. Second\n2. Third\n");
		});
	});

	describe("internal functions", () => {
		test("serializes objects via @toJSON", () => {
			const tokens = templateToTokens("{{@toJSON page}}");
			const page = { title: "Test", domain: "example.com" };
			const ctx = {
				page,
				lang: { dst: "English" },
			};
			const result = tokensToString(ctx, tokens);
			expect(result).toBe(JSON.stringify(page));
		});

		test("serializes with indentation via @toJSONPretty", () => {
			const tokens = templateToTokens("{{@toJSONPretty page}}");
			const page = { title: "Test", domain: "example.com" };
			const ctx = {
				page,
				lang: { dst: "English" },
			};
			const result = tokensToString(ctx, tokens);
			expect(result).toBe(JSON.stringify(page, null, 2));
		});

		test("throws for unknown internal function", () => {
			const tokens = templateToTokens("{{@unknown page}}");
			const ctx = { page: {}, lang: { dst: "English" } };
			expect(() => tokensToString(ctx, tokens)).toThrow(TemplateParseError);
		});
	});

	describe("edge cases", () => {
		test("handles empty template", () => {
			const tokens = templateToTokens("");
			const ctx = { lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});

		test("handles whitespace", () => {
			const tokens = templateToTokens("  {{name}}  ");
			const ctx = { name: "Test", lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("  Test  ");
		});

		test("handles newlines", () => {
			const tokens = templateToTokens("Line 1\n{{name}}\nLine 3");
			const ctx = { name: "Middle", lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("Line 1\nMiddle\nLine 3");
		});

		test("handles special characters", () => {
			const tokens = templateToTokens("Special: {{chars}}!");
			const ctx = { chars: "!@#$%^&*()", lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("Special: !@#$%^&*()!");
		});

		test("handles numeric values", () => {
			const tokens = templateToTokens("Value: {{num}}");
			const ctx = { num: 42, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("Value: 42");
		});

		test("handles boolean values", () => {
			const tokens = templateToTokens("{{bool1}} {{bool2}}");
			const ctx = { bool1: true, bool2: false, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("true false");
		});

		test("handles null values", () => {
			const tokens = templateToTokens("{{val}}");
			const ctx = { val: null, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});

		test("handles undefined nested property", () => {
			const tokens = templateToTokens("{{a.b.c}}");
			const ctx = { a: {}, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});

		test("handles mixed data types in array", () => {
			const tokens = templateToTokens("{{items}}");
			const ctx = { items: [1, "two", true, null], lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("1, two, true, ");
		});

		test("handles empty string value", () => {
			const tokens = templateToTokens("{{text}}");
			const ctx = { text: "", lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("");
		});

		test("handles complex nested object serialization", () => {
			const tokens = templateToTokens("{{data}}");
			const ctx = {
				data: { a: { b: [1, 2] }, c: "test" },
				lang: { dst: "English" },
			};
			const result = tokensToString(ctx, tokens);
			expect(result).toBe('{"a":{"b":[1,2]},"c":"test"}');
		});

		test("handles unicode characters", () => {
			const tokens = templateToTokens("{{text}}");
			const ctx = { text: "你好 🌍", lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("你好 🌍");
		});

		test("handles negative numbers", () => {
			const tokens = templateToTokens("{{num}}");
			const ctx = { num: -42, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe("-42");
		});

		test("handles floating point numbers", () => {
			const tokens = templateToTokens("{{num}}");
			const ctx = { num: Math.PI, lang: { dst: "English" } };
			const result = tokensToString(ctx, tokens);
			expect(result).toBe(String(Math.PI));
		});
	});
});

describe("integration tests", () => {
	test("full prompt template with all features", () => {
		const template = `Translate the following text to {{lang.dst}}:
{{#if lang.src}}Source language: {{lang.src}}{{/if}}

{{#if page}}Context:
- Page title: {{page.title}}
- Domain: {{page.domain}}
{{/if}}

{{#if text}}Text to translate:
{{#for idx, line:text}}{{idx}}. {{line}}
{{/for}}{{/if}}

{{#if surr}}Surrounding context:
Before: {{surr.before}}
After: {{surr.after}}
{{/if}}`;

		const tokens = templateToTokens(template);
		const ctx = {
			text: ["Hello", "World"],
			lang: { src: "English", dst: "Spanish" },
			page: { title: "Test Page", domain: "example.com" },
			surr: { content: "Hello", before: "Say", after: "please" },
		};
		const result = tokensToString(ctx, tokens);

		expect(result).toContain("Translate the following text to Spanish");
		expect(result).toContain("Source language: English");
		expect(result).toContain("Page title: Test Page");
		expect(result).toContain("0. Hello");
		expect(result).toContain("1. World");
		expect(result).toContain("Before: Say");
		expect(result).toContain("After: please");
	});

	test("conditional rendering based on data availability", () => {
		const template = `{{#if page.title}}Title: {{page.title}}{{/if}}
{{#if page.domain}}Domain: {{page.domain}}{{/if}}`;

		const tokens = templateToTokens(template);

		// With both fields
		let ctx = {
			page: { title: "Test", domain: "example.com" },
			lang: { dst: "English" },
		};
		let result = tokensToString(ctx, tokens);
		expect(result).toBe("Title: Test\nDomain: example.com");

		// With only title
		ctx = { page: { title: "Test", domain: "" }, lang: { dst: "English" } };
		result = tokensToString(ctx, tokens);
		expect(result).toBe("Title: Test\n");

		// With neither
		ctx = { page: { title: "", domain: "" }, lang: { dst: "English" } };
		result = tokensToString(ctx, tokens);
		expect(result).toBe("\n");
	});

	test("output array access for multi-step prompts", () => {
		const template = `Step 1: {{output[0]}}
Step 2: {{output[1]}}
{{#if output[2]}}Step 3: {{output[2]}}{{/if}}`;

		const tokens = templateToTokens(template);
		const ctx = {
			output: ["First result", "Second result"],
			lang: { dst: "English" },
		};
		const result = tokensToString(ctx, tokens);

		expect(result).toContain("Step 1: First result");
		expect(result).toContain("Step 2: Second result");
		expect(result).not.toContain("Step 3:");
	});

	test("handles missing data gracefully throughout template", () => {
		const template = `{{#if title}}Title: {{title}}{{/if}}
{{#if description}}Description: {{description}}{{/if}}
{{#if tags}}Tags: {{#for tag:tags}}{{tag}} {{/for}}{{/if}}`;

		const tokens = templateToTokens(template);
		const ctx = {
			title: "Test",
			// description is missing
			tags: [], // empty array
			lang: { dst: "English" },
		};
		const result = tokensToString(ctx, tokens);
		expect(result).toContain("Title: Test");
		expect(result).not.toContain("Description:");
		expect(result).not.toContain("Tags:");
	});

	test("complex nested conditionals with loops", () => {
		const template =
			"{{#if items}}Items:\n" +
			"{{#for item:items}}" +
			"{{#if item.active}}Active{{#else}}Inactive{{/if}} {{item.name}} " +
			"{{/for}}" +
			"{{/if}}";

		const tokens = templateToTokens(template);
		const ctx = {
			items: [
				{ name: "Item1", active: true },
				{ name: "Item2", active: false },
				{ name: "Item3", active: true },
			],
			lang: { dst: "English" },
		};
		const result = tokensToString(ctx, tokens);
		expect(result).toContain("Active Item1");
		// Note: boolean false is not considered empty, so it renders as Active
		// To get Inactive, we need to use undefined, null, "", [], or {}
		expect(result).toContain("Active Item2");
		expect(result).toContain("Active Item3");
	});

	test("handles special characters in all contexts", () => {
		const template = `{{title}}
{{#for item:items}}{{item}}{{/for}}
{{#if note}}Note: {{note}}{{/if}}`;

		const tokens = templateToTokens(template);
		const ctx = {
			title: "<script>alert('xss')</script>",
			items: ["<div>", "</div>", "& special"],
			note: "Test & \"quotes\" 'apostrophes'",
			lang: { dst: "English" },
		};
		const result = tokensToString(ctx, tokens);
		expect(result).toContain("<script>alert('xss')</script>");
		expect(result).toContain("<div>");
		expect(result).toContain("Test & \"quotes\" 'apostrophes'");
	});

	test("multiple elif branches evaluation", () => {
		const template = "{{#if a}}A{{#elif b}}B{{#elif c}}C{{#else}}D{{/if}}";
		const tokens = templateToTokens(template);

		// Test each branch
		expect(
			tokensToString(
				{ a: "val", b: undefined, c: undefined, lang: { dst: "English" } },
				tokens,
			),
		).toBe("A");
		expect(
			tokensToString(
				{ a: undefined, b: "val", c: undefined, lang: { dst: "English" } },
				tokens,
			),
		).toBe("B");
		expect(
			tokensToString(
				{ a: undefined, b: undefined, c: "val", lang: { dst: "English" } },
				tokens,
			),
		).toBe("C");
		expect(
			tokensToString(
				{ a: undefined, b: undefined, c: undefined, lang: { dst: "English" } },
				tokens,
			),
		).toBe("D");
	});

	test("loop with conditional and nested property access", () => {
		const template = `{{#for user:users}}{{#if user.profile.verified}}✓ {{user.profile.name}}{{#else}}{{user.profile.name}}{{/if}}
{{/for}}`;

		const tokens = templateToTokens(template);
		const ctx = {
			users: [
				{ profile: { name: "Alice", verified: true } },
				{ profile: { name: "Bob", verified: false } },
				{ profile: { name: "Charlie", verified: true } },
			],
			lang: { dst: "English" },
		};
		const result = tokensToString(ctx, tokens);
		expect(result).toContain("✓ Alice");
		// Note: boolean false is not empty
		expect(result).toContain("Bob");
		expect(result).toContain("✓ Charlie");
	});

	test("array indexing with conditional", () => {
		const template = `{{#if items[0]}}First: {{items[0]}}{{/if}}
{{#if items[1]}}Second: {{items[1]}}{{/if}}
{{#if items[2]}}Third: {{items[2]}}{{/if}}`;

		const tokens = templateToTokens(template);
		const ctx = {
			items: ["one", "two"],
			lang: { dst: "English" },
		};
		const result = tokensToString(ctx, tokens);
		expect(result).toContain("First: one");
		expect(result).toContain("Second: two");
		expect(result).not.toContain("Third:");
	});

	test("complex language context template", () => {
		const template = `{{#if lang.src}}Translate from {{lang.src}} to {{lang.dst}}{{#else}}Translate to {{lang.dst}} (auto-detect source){{/if}}

Text: {{text}}

{{#if page}}Context from {{page.domain}}: {{page.title}}{{/if}}`;

		const tokens = templateToTokens(template);

		// With source language
		let ctx = {
			text: "Hello",
			lang: { src: "English", dst: "Spanish" },
			page: { domain: "example.com", title: "Test" },
		};
		let result = tokensToString(ctx, tokens);
		expect(result).toContain("Translate from English to Spanish");
		expect(result).toContain("Context from example.com: Test");

		// Without source language
		ctx = {
			text: "Hello",
			lang: { dst: "Spanish" },
		} as typeof ctx;
		result = tokensToString(ctx, tokens);
		expect(result).toContain("Translate to Spanish (auto-detect source)");
		expect(result).not.toContain("Context from");
	});

	test("empty vs zero vs false distinctions", () => {
		const template = `{{#if zero}}zero{{/if}}
{{#if empty}}empty{{/if}}
{{#if falseBool}}false{{/if}}
{{#if nullVal}}null{{/if}}
{{#if undefinedVal}}undefined{{/if}}`;

		const tokens = templateToTokens(template);
		const ctx = {
			zero: 0,
			empty: "",
			falseBool: false,
			nullVal: null,
			undefinedVal: undefined,
			lang: { dst: "English" },
		};
		const result = tokensToString(ctx, tokens);

		// Note: In isEmpty function, only null, undefined, empty string, empty array,
		// and empty object are considered empty. 0 and false are NOT empty.
		expect(result).toContain("zero");
		expect(result).not.toContain("empty");
		expect(result).toContain("false");
		expect(result).not.toContain("null");
		expect(result).not.toContain("undefined");
	});
});
