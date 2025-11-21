export function jsonAutocomplete(partialJson: string): string {
	const stack: ("{" | "[")[] = [];
	let inString = false;
	let isEscaped = false;

	// 1. First pass: Build the context stack
	for (let i = 0; i < partialJson.length; i++) {
		const char = partialJson[i];

		if (inString) {
			if (isEscaped) {
				isEscaped = false;
			} else if (char === "\\") {
				isEscaped = true;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}

		switch (char) {
			case "{":
			case "[":
				stack.push(char);
				break;
			case "}":
				if (stack.length > 0 && stack[stack.length - 1] === "{") {
					stack.pop();
				}
				break;
			case "]":
				if (stack.length > 0 && stack[stack.length - 1] === "[") {
					stack.pop();
				}
				break;
			case '"':
				inString = true;
				isEscaped = false;
				break;
		}
	}

	let completion = partialJson;

	// 2. Autocomplete based on the current state
	if (inString) {
		completion += '"';
	}

	// 3. Close any remaining open structures from the stack.
	while (stack.length > 0) {
		const openChar = stack.pop();
		if (openChar === "{") {
			completion += "}";
		} else {
			completion += "]";
		}
	}

	return completion;
}

export function autoStripMarkdown<T>(maybeMarkdownJson: string): T {
	let er: unknown;
	try {
		return JSON.parse(maybeMarkdownJson) as T;
	} catch (e) {
		er = e;
	}

	const markdownRegex = /```(?:\w+)?\s*([\s\S]*?)\s*```/;
	const match = maybeMarkdownJson.match(markdownRegex);

	if (match?.[1]) {
		return JSON.parse(match[1]) as T;
	}
	throw er;
}

export function autoParseJson<T>(maybePartialJson?: string): T | null {
	if (!maybePartialJson) return null;

	try {
		return JSON.parse(maybePartialJson) as T;
	} catch {}

	try {
		let cleaned = maybePartialJson.replace(/^\s*```(?:\w+)?\s*/, "");
		cleaned = cleaned.replace(/\s*```\s*$/, "");

		const completedJson = jsonAutocomplete(cleaned);
		return JSON.parse(completedJson) as T;
	} catch {
		return null;
	}
}
