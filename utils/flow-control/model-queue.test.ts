import { expect, test } from "bun:test";
import type { UnaryResult } from "./model-queue";
import { createModelQueue } from "./model-queue";

const createLimits = () => ({
	requestConcurrency: 1,
	tokensPerMinute: 1000,
	maxBatchSize: 10,
});

test("runs unary tasks sequentially when concurrency is one", async () => {
	const queue = createModelQueue("model", createLimits(), () => {});
	let releaseFirst: (() => void) | undefined;
	let firstDone = false;

	const first = queue.enqueueUnary(async (): Promise<UnaryResult<string>> => {
		return await new Promise((resolve) => {
			releaseFirst = () => {
				firstDone = true;
				resolve({ value: "first", completionTokens: 0 });
			};
		});
	}, 10);

	const second = queue.enqueueUnary(async (): Promise<UnaryResult<string>> => {
		if (!firstDone) {
			throw new Error("Second task started before first completed");
		}
		return { value: "second", completionTokens: 0 };
	}, 10);

	expect(releaseFirst).toBeDefined();
	releaseFirst?.();

	const firstValue = await first;
	expect(firstValue).toBe("first");
	const secondValue = await second;
	expect(secondValue).toBe("second");
});

test("handles stream tasks and completes after iterator finishes", async () => {
	const queue = createModelQueue("model", createLimits(), () => {});
	const iterator = await queue.enqueueStream(async () => {
		async function* chunks() {
			yield "a";
			yield "b";
		}
		return { iterator: chunks(), completion: Promise.resolve(2) };
	}, 10);

	const first = await iterator.next();
	expect(first).toEqual({ value: "a", done: false });
	const second = await iterator.next();
	expect(second).toEqual({ value: "b", done: false });
	const end = await iterator.next();
	expect(end.done).toBe(true);
});
