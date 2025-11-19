import { fetchDictionary } from "@/utils/dictionary";
import type { DictionaryService } from "@/utils/rpc";

export const createDictionaryService = (): DictionaryService => {
	return {
		lookup: async (word: string) => {
			return await fetchDictionary(word);
		},
	};
};
