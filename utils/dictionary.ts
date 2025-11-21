export interface DictionaryEntry {
	word: string;
	phonetic?: string;
	phonetics: Array<{
		text?: string;
		audio?: string;
		sourceUrl?: string;
		license?: {
			name: string;
			url: string;
		};
	}>;
	meanings: Array<{
		partOfSpeech: string;
		definitions: Array<{
			definition: string;
			synonyms: string[];
			antonyms: string[];
			example?: string;
		}>;
		synonyms: string[];
		antonyms: string[];
	}>;
	license: {
		name: string;
		url: string;
	};
	sourceUrls: string[];
}

export type DictionaryResponse = DictionaryEntry[];

export const fetchDictionary = async (
	word: string,
): Promise<DictionaryResponse | null> => {
	try {
		const response = await fetch(
			`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
		);
		if (!response.ok) {
			if (response.status === 404) {
				return null;
			}
			throw new Error(`Dictionary API error: ${response.statusText}`);
		}
		return (await response.json()) as DictionaryResponse;
	} catch (error) {
		console.error("Failed to fetch dictionary data:", error);
		return null;
	}
};
