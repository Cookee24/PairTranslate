import { expect, test } from "bun:test";
import { jsonAutocomplete } from "./json-autocomplete";

test("should return an empty string if the input is empty", () => {
	expect(jsonAutocomplete("")).toBe("");
});

test("should return the same string if it's a valid JSON", () => {
	const validJson = '{"key": "value", "number": 123}';
	expect(jsonAutocomplete(validJson)).toBe(validJson);
});

test("should close a simple unclosed object", () => {
	expect(jsonAutocomplete('{"key": "value"')).toBe('{"key": "value"}');
});

test("should close a simple unclosed array", () => {
	expect(jsonAutocomplete('["item1", "item2"')).toBe('["item1", "item2"]');
});

test("should close nested unclosed structures", () => {
	expect(
		jsonAutocomplete('{"key": ["item1", {"nestedKey": "nestedValue"'),
	).toBe('{"key": ["item1", {"nestedKey": "nestedValue"}]}');
});

test("should close an unclosed string", () => {
	expect(jsonAutocomplete('"hello')).toBe('"hello"');
});

test("should close an unclosed string within an object", () => {
	expect(jsonAutocomplete('{"key": "value')).toBe('{"key": "value"}');
});

test("should handle escaped quotes inside a string", () => {
	const json = '{"key": "value with \\"quote\\""}';
	expect(jsonAutocomplete(json)).toBe(json);
});

test("should handle partial json with escaped quote", () => {
	const partialJson = '{"key": "value with \\"quote';
	expect(jsonAutocomplete(partialJson)).toBe('{"key": "value with \\"quote"}');
});

test("should close multiple levels of nesting", () => {
	const partialJson = '{"a": {"b": {"c": [1, 2';
	expect(jsonAutocomplete(partialJson)).toBe('{"a": {"b": {"c": [1, 2]}}}');
});

test("should not close anything if json is valid", () => {
	const json = '{"a": 1, "b": [1,2,3], "c": { "d": "e"}}';
	expect(jsonAutocomplete(json)).toBe(json);
});

test("should handle complex partial json", () => {
	const partialJson = '{"a": 1, "b": [1, 2, {"c": "d';
	expect(jsonAutocomplete(partialJson)).toBe(
		'{"a": 1, "b": [1, 2, {"c": "d"}]}',
	);
});

test("should handle complex partial json with unclosed string", () => {
	const partialJson = '{"a": 1, "b": [1, 2, {"c": "d"';
	expect(jsonAutocomplete(partialJson)).toBe(
		'{"a": 1, "b": [1, 2, {"c": "d"}]}',
	);
});
