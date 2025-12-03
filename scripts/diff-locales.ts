#!/usr/bin/env bun
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const localesDir = join(repoRoot, "locales");

const availableLocales = (await readdir(localesDir))
	.filter((name) => name.endsWith(".toml"))
	.sort();

if (availableLocales.length === 0) {
	console.error("No locale files were found.");
	process.exit(1);
}

const args = Bun.argv.slice(2).filter(Boolean);
const baseFile = resolveLocaleFile(args[0] ?? "en");
const targetArgs =
	args.length > 1
		? args.slice(1)
		: availableLocales.filter((name) => name !== baseFile);

if (targetArgs.length === 0) {
	console.log("Nothing to compare - no target locales were provided.");
	process.exit(0);
}

const baseData = await parseLocale(baseFile);
const baseKeys = flattenKeys(baseData);

for (const rawTarget of targetArgs) {
	const targetFile = resolveLocaleFile(rawTarget);
	const targetData = await parseLocale(targetFile);
	const targetKeys = flattenKeys(targetData);

	printDiff(baseFile, targetFile, baseKeys, targetKeys);
}

function resolveLocaleFile(arg: string) {
	const normalized = arg.endsWith(".toml") ? arg : `${arg}.toml`;
	if (!availableLocales.includes(normalized)) {
		console.error(
			`Unknown locale: ${arg} (expected one of ${availableLocales.join(", ")})`,
		);
		process.exit(1);
	}
	return normalized;
}

async function parseLocale(fileName: string) {
	const filePath = join(localesDir, fileName);
	try {
		const content = await Bun.file(filePath).text();
		return Bun.TOML.parse(content);
	} catch (error) {
		console.error(`Failed to parse ${fileName}:`, error);
		process.exit(1);
	}
}

function flattenKeys(data: unknown) {
	const keys = new Set<string>();
	const visit = (value: unknown, prefix: string) => {
		if (Array.isArray(value)) {
			value.forEach((entry, idx) => {
				const next = prefix ? `${prefix}.${idx}` : `${idx}`;
				visit(entry, next);
			});
			return;
		}

		if (value && typeof value === "object") {
			for (const [childKey, childValue] of Object.entries(value)) {
				const next = prefix ? `${prefix}.${childKey}` : childKey;
				visit(childValue, next);
			}
			return;
		}

		if (prefix) {
			keys.add(prefix);
		}
	};

	visit(data, "");
	return keys;
}

function toSortedDifference(left: Set<string>, right: Set<string>) {
	return [...left].filter((key) => !right.has(key)).sort();
}

function printDiff(
	base: string,
	target: string,
	baseKeys: Set<string>,
	targetKeys: Set<string>,
) {
	const missing = toSortedDifference(baseKeys, targetKeys);
	const extra = toSortedDifference(targetKeys, baseKeys);

	console.log(`\n${base} -> ${target}`);
	if (missing.length === 0 && extra.length === 0) {
		console.log("  Keys are aligned");
		return;
	}

	if (missing.length > 0) {
		console.log("  Missing keys:");
		for (const key of missing) {
			console.log(`    - ${key}`);
		}
	}

	if (extra.length > 0) {
		console.log("  Extra keys:");
		for (const key of extra) {
			console.log(`    - ${key}`);
		}
	}
}
