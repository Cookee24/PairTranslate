import { getNativeName } from "./constants";
import type { PromptSettings } from "./settings/def";
import type { PageContext, TextContext } from "./types";

export interface PromptContext {
	targetLang: string;
	sourceLang?: string;
	page?: PageContext;
	textContext?: TextContext;
	texts?: string[];
}

export interface BuiltPrompt {
	system: string;
	user: string;
}

/**
 * Build page context string from PageContext object
 */
export function buildPageContextString(pageContext?: PageContext): string {
	if (!pageContext) return "";

	let content = `\nTitle: ${pageContext.pageTitle}`;
	content += `\nDomain: ${pageContext.domain}`;

	if (pageContext.pageDescription) {
		content += `\nDescription: ${pageContext.pageDescription}`;
	}

	if (pageContext.pageKeywords?.length) {
		content += `\nKeywords: ${pageContext.pageKeywords.join(", ")}`;
	}

	for (const [key, value] of Object.entries(pageContext.extra || {})) {
		content += `\n${key}: ${value}`;
	}

	return content;
}

/**
 * Replace template variables in a string
 */
function replaceTemplateVariables(
	template: string,
	context: PromptContext,
): string {
	let result = template;

	// Replace target language with native name
	result = result.replaceAll(
		"{{targetLang}}",
		getNativeName(context.targetLang),
	);

	// Replace source language if provided
	if (context.sourceLang) {
		result = result.replaceAll(
			"{{sourceLang}}",
			getNativeName(context.sourceLang),
		);
	}

	// Replace page context
	if (context.page) {
		result = result.replaceAll(
			"{{page}}",
			buildPageContextString(context.page),
		);
	}

	// Replace text context fields
	if (context.textContext) {
		result = result.replaceAll("{{content}}", context.textContext.content);
		result = result.replaceAll("{{contextBefore}}", context.textContext.before);
		result = result.replaceAll("{{contextAfter}}", context.textContext.after);
	}

	return result;
}

/**
 * Process for loop template syntax for batch operations
 * Supports: {{#for}}...@@P{{index}}...{{content}}...{{/for}}
 */
function processForLoop(template: string, texts: string[]): string {
	const forLoopRegex = /\{\{#for\}\}([\s\S]*?)\{\{\/for\}\}/g;

	return template.replace(forLoopRegex, (_, loopContent: string) => {
		return texts
			.map((text, index) => {
				return loopContent
					.replaceAll("{{index}}", String(index + 1))
					.replaceAll("{{content}}", text);
			})
			.join("\n");
	});
}

/**
 * Build prompt from PromptSettings and context
 */
export function buildPrompt(
	promptSettings: PromptSettings,
	context: PromptContext,
): BuiltPrompt {
	const system = replaceTemplateVariables(promptSettings.system || "", context);

	let user = promptSettings.user || "";

	// Process batch for loop if texts array is provided
	if (context.texts && context.texts.length > 0) {
		user = processForLoop(user, context.texts);
	}

	user = replaceTemplateVariables(user, context);

	return { system, user };
}

/**
 * Parse batch response using delimiter from prompt settings
 */
export function parseBatchResponse(
	response: string,
	promptSettings: PromptSettings,
): string[] {
	if (!promptSettings.batch) {
		throw new Error("Prompt settings does not support batch operations");
	}

	const { delimiter, trimWhitespace } = promptSettings.batch;

	// Build regex pattern from delimiter template
	// Convert @@P{{index}} to @@P\d+
	const pattern = delimiter.replace("{{index}}", "\\d+");
	const regex = new RegExp(pattern);

	// Split by delimiter and filter out empty sections
	const sections = response.split(regex).filter((s) => s.trim().length > 0);

	if (trimWhitespace) {
		return sections.map((s) => s.trim());
	}

	return sections;
}

/**
 * Validate if a prompt supports batch operations
 */
export function isBatchPrompt(promptSettings: PromptSettings): boolean {
	return promptSettings.batch !== undefined;
}
