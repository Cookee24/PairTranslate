import { expect, test } from "bun:test";
import { createTokenBucket } from "./token-bucket";

test("consumes available tokens", () => {
	let now = 0;
	const bucket = createTokenBucket(60, { now: () => now });
	expect(bucket.consume(30)).toBe(true);
	expect(bucket.available()).toBe(30);
	expect(bucket.consume(40)).toBe(false);
});

test("refills tokens over time", () => {
	let now = 0;
	const bucket = createTokenBucket(60, { now: () => now });
	bucket.consume(60);
	expect(bucket.consume(1)).toBe(false);
	now += 30000;
	expect(bucket.consume(30)).toBe(true);
});

test("reports wait time for deficit", () => {
	let now = 0;
	const bucket = createTokenBucket(120, { now: () => now });
	bucket.consume(120);
	now += 15000;
	expect(bucket.msUntil(60)).toBe(15000);
});
