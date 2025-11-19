import { expect, test } from "bun:test";
import { createStreamBridge } from "./stream-bridge";

test("delivers pushed values to awaiting consumers", async () => {
	const bridge = createStreamBridge<number>();
	const nextPromise = bridge.iterator.next();
	bridge.push(42);
	const result = await nextPromise;
	expect(result).toEqual({ value: 42, done: false });
});

test("flushes buffered values in order", async () => {
	const bridge = createStreamBridge<string>();
	bridge.push("a");
	bridge.push("b");
	const first = await bridge.iterator.next();
	expect(first).toEqual({ value: "a", done: false });
	const second = await bridge.iterator.next();
	expect(second).toEqual({ value: "b", done: false });
});

test("propagates failures to iterator", async () => {
	const bridge = createStreamBridge<string>();
	const promise = bridge.iterator.next();
	bridge.fail(new Error("boom"));
	let error: unknown;
	try {
		await promise;
	} catch (err) {
		error = err;
	}
	expect((error as Error).message).toBe("boom");
});

test("ends iterator when closed", async () => {
	const bridge = createStreamBridge<string>();
	bridge.close();
	const result = await bridge.iterator.next();
	expect(result).toEqual({ value: undefined, done: true });
});
