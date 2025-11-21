import { createResource } from "solid-js";

export const createDictionary = (word: () => string) => {
	const [data] = createResource(word, async (w) => {
		if (!w || w.trim().split(/\s+/).length > 3) return null; // Only lookup single words or short phrases
		return await window.rpc.lookup(w);
	});

	return data;
};
