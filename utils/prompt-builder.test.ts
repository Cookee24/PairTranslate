import { describe, expect, test } from "bun:test";
import {
	buildPageContextString,
	buildPrompt,
	isBatchPrompt,
	type PromptContext,
	parseBatchResponse,
} from "./prompt-builder";
import type { PromptSettings } from "./settings/def";
import type { PageContext, TextContext } from "./types";

describe("buildPageContextString", () => {
	test("should return empty string for undefined context", () => {
		expect(buildPageContextString(undefined)).toBe("");
	});

	test("should build basic page context", () => {
		const context: PageContext = {
			pageTitle: "Test Page",
			domain: "example.com",
			pageDescription: "",
			pageKeywords: [],
			extra: {},
		};

		const result = buildPageContextString(context);
		expect(result).toContain("Title: Test Page");
		expect(result).toContain("Domain: example.com");
	});

	test("should include description when provided", () => {
		const context: PageContext = {
			pageTitle: "Test Page",
			domain: "example.com",
			pageDescription: "A test description",
			pageKeywords: [],
			extra: {},
		};

		const result = buildPageContextString(context);
		expect(result).toContain("Description: A test description");
	});

	test("should include keywords when provided", () => {
		const context: PageContext = {
			pageTitle: "Test Page",
			domain: "example.com",
			pageDescription: "",
			pageKeywords: ["test", "example"],
			extra: {},
		};

		const result = buildPageContextString(context);
		expect(result).toContain("Keywords: test, example");
	});

	test("should include extra fields", () => {
		const context: PageContext = {
			pageTitle: "Test Page",
			domain: "example.com",
			pageDescription: "",
			pageKeywords: [],
			extra: {
				author: "John Doe",
				category: "Technology",
			},
		};

		const result = buildPageContextString(context);
		expect(result).toContain("author: John Doe");
		expect(result).toContain("category: Technology");
	});
});

describe("buildPrompt", () => {
	test("should replace targetLang in system prompt", () => {
		const promptSettings: PromptSettings = {
			name: "Test Prompt",
			system: "Translate to {{targetLang}}",
			user: "Content: {{content}}",
		};

		const context: PromptContext = {
			targetLang: "en",
			textContext: {
				content: "Hello",
				before: "",
				after: "",
			},
		};

		const result = buildPrompt(promptSettings, context);
		expect(result.system).toContain("Translate to English");
	});

	test("should replace all template variables", () => {
		const promptSettings: PromptSettings = {
			name: "Test Prompt",
			system: "Translate from {{sourceLang}} to {{targetLang}}",
			user: "<page>{{page}}</page>\n<context before>{{contextBefore}}</context>\n<context after>{{contextAfter}}</context>\n<content>{{content}}</content>",
		};

		const pageContext: PageContext = {
			pageTitle: "Test Page",
			domain: "example.com",
			pageDescription: "Test description",
			pageKeywords: ["test"],
			extra: {},
		};

		const textContext: TextContext = {
			content: "Hello World",
			before: "This is",
			after: "!",
		};

		const context: PromptContext = {
			targetLang: "zh-CN",
			sourceLang: "en",
			page: pageContext,
			textContext: textContext,
		};

		const result = buildPrompt(promptSettings, context);
		expect(result.system).toContain("English");
		expect(result.system).toContain("简体中文");
		expect(result.user).toContain("Title: Test Page");
		expect(result.user).toContain("<content>Hello World</content>");
		expect(result.user).toContain("<context before>This is</context>");
		expect(result.user).toContain("<context after>!</context>");
	});

	test("should handle batch prompts with for loop", () => {
		const promptSettings: PromptSettings = {
			name: "Batch Test",
			system: "Translate to {{targetLang}}",
			user: "<page>{{page}}</page>\n{{#for}}\n@@P{{index}}\n{{content}}\n{{/for}}",
			batch: {
				delimiter: "@@P{{index}}",
				trimWhitespace: true,
			},
		};

		const context: PromptContext = {
			targetLang: "en",
			texts: ["Hello", "World", "Test"],
			page: {
				pageTitle: "Test",
				domain: "example.com",
				pageDescription: "",
				pageKeywords: [],
				extra: {},
			},
		};

		const result = buildPrompt(promptSettings, context);
		expect(result.user).toContain("@@P1");
		expect(result.user).toContain("Hello");
		expect(result.user).toContain("@@P2");
		expect(result.user).toContain("World");
		expect(result.user).toContain("@@P3");
		expect(result.user).toContain("Test");
	});

	test("should handle empty optional fields", () => {
		const promptSettings: PromptSettings = {
			name: "Test",
			system: "System prompt",
		};

		const context: PromptContext = {
			targetLang: "en",
		};

		const result = buildPrompt(promptSettings, context);
		expect(result.system).toBe("System prompt");
		expect(result.user).toBe("");
	});
});

describe("parseBatchResponse", () => {
	test("should parse batch response with delimiter", () => {
		const promptSettings: PromptSettings = {
			name: "Batch",
			system: "",
			batch: {
				delimiter: "@@P{{index}}",
				trimWhitespace: true,
			},
		};

		const response = `@@P1
Translation 1
@@P2
Translation 2
@@P3
Translation 3`;

		const result = parseBatchResponse(response, promptSettings);
		expect(result).toHaveLength(3);
		expect(result[0]).toBe("Translation 1");
		expect(result[1]).toBe("Translation 2");
		expect(result[2]).toBe("Translation 3");
	});

	test("should handle trimWhitespace option", () => {
		const promptSettings: PromptSettings = {
			name: "Batch",
			system: "",
			batch: {
				delimiter: "@@P{{index}}",
				trimWhitespace: false,
			},
		};

		const response = `@@P1
  Translation 1  
@@P2
  Translation 2  `;

		const result = parseBatchResponse(response, promptSettings);
		expect(result[0]).toBe("\n  Translation 1  \n");
		expect(result[1]).toBe("\n  Translation 2  ");
	});

	test("should throw error for non-batch prompt", () => {
		const promptSettings: PromptSettings = {
			name: "Non-batch",
			system: "",
		};

		expect(() => {
			parseBatchResponse("test", promptSettings);
		}).toThrow("does not support batch operations");
	});

	test("should filter out empty sections", () => {
		const promptSettings: PromptSettings = {
			name: "Batch",
			system: "",
			batch: {
				delimiter: "@@P{{index}}",
				trimWhitespace: true,
			},
		};

		const response = `@@P1
Translation 1
@@P2

@@P3
Translation 3`;

		const result = parseBatchResponse(response, promptSettings);
		expect(result).toHaveLength(2);
		expect(result[0]).toBe("Translation 1");
		expect(result[1]).toBe("Translation 3");
	});
});

describe("isBatchPrompt", () => {
	test("should return true for batch prompt", () => {
		const promptSettings: PromptSettings = {
			name: "Batch",
			system: "",
			batch: {
				delimiter: "@@P{{index}}",
				trimWhitespace: true,
			},
		};

		expect(isBatchPrompt(promptSettings)).toBe(true);
	});

	test("should return false for non-batch prompt", () => {
		const promptSettings: PromptSettings = {
			name: "Regular",
			system: "",
		};

		expect(isBatchPrompt(promptSettings)).toBe(false);
	});
});

describe("Integration tests", () => {
	test("should handle complete translation workflow", () => {
		const promptSettings: PromptSettings = {
			name: "Translation",
			system:
				"You are a professional translator. Translate from {{sourceLang}} to {{targetLang}}.",
			user: "<page>{{page}}</page>\n<context before>{{contextBefore}}</context>\n<content>{{content}}</content>\n<context after>{{contextAfter}}</context>",
		};

		const context: PromptContext = {
			targetLang: "ja",
			sourceLang: "en",
			page: {
				pageTitle: "Documentation",
				domain: "docs.example.com",
				pageDescription: "API Documentation",
				pageKeywords: ["api", "docs"],
				extra: { version: "v1.0" },
			},
			textContext: {
				content: "Hello World",
				before: "Example: ",
				after: " - Test",
			},
		};

		const result = buildPrompt(promptSettings, context);

		expect(result.system).toContain("English");
		expect(result.system).toContain("日本語");
		expect(result.user).toContain("Title: Documentation");
		expect(result.user).toContain("Domain: docs.example.com");
		expect(result.user).toContain("Description: API Documentation");
		expect(result.user).toContain("Keywords: api, docs");
		expect(result.user).toContain("version: v1.0");
		expect(result.user).toContain("<content>Hello World</content>");
		expect(result.user).toContain("<context before>Example: </context>");
		expect(result.user).toContain("<context after> - Test</context>");
	});

	test("should handle complete batch workflow", () => {
		const promptSettings: PromptSettings = {
			name: "Batch Translation",
			system:
				"Translate all texts to {{targetLang}}. Preserve the @@P markers.",
			user: "<page>{{page}}</page>\n{{#for}}\n@@P{{index}}\n{{content}}\n{{/for}}",
			batch: {
				delimiter: "@@P{{index}}",
				trimWhitespace: true,
			},
		};

		const context: PromptContext = {
			targetLang: "es",
			texts: ["First text", "Second text", "Third text"],
			page: {
				pageTitle: "Test",
				domain: "test.com",
				pageDescription: "",
				pageKeywords: [],
				extra: {},
			},
		};

		const prompt = buildPrompt(promptSettings, context);

		expect(prompt.system).toContain("Español");
		expect(prompt.user).toContain("@@P1");
		expect(prompt.user).toContain("First text");
		expect(prompt.user).toContain("@@P2");
		expect(prompt.user).toContain("Second text");
		expect(prompt.user).toContain("@@P3");
		expect(prompt.user).toContain("Third text");

		// Simulate response parsing
		const mockResponse = `@@P1
Primera texto
@@P2
Segundo texto
@@P3
Tercero texto`;

		const parsed = parseBatchResponse(mockResponse, promptSettings);
		expect(parsed).toHaveLength(3);
		expect(parsed[0]).toBe("Primera texto");
		expect(parsed[1]).toBe("Segundo texto");
		expect(parsed[2]).toBe("Tercero texto");
	});
});
