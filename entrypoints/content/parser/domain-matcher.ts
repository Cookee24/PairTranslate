type TrieNode = {
	[key: string]: TrieNode | number | undefined;
	_end_?: number;
};

const createTrie = (patterns: string[]): TrieNode => {
	const root: TrieNode = {};

	patterns.forEach((pattern, index) => {
		const parts = pattern.split(".").reverse();

		let currentNode = root;
		for (const part of parts) {
			if (!currentNode[part]) {
				currentNode[part] = {};
			}
			currentNode = currentNode[part] as TrieNode;
		}

		currentNode._end_ = index;
	});

	return root;
};

export const makeDomainMatcher = (
	patterns: string[],
): ((domain: string) => number | null) => {
	const trie = createTrie(patterns);

	return (domain: string): number | null => {
		const parts = domain.split(".").reverse();
		let bestMatchIndex: number | null = null;
		let currentNode: TrieNode | undefined = trie;

		const updateBestMatch = (index: number) => {
			if (bestMatchIndex === null || index < bestMatchIndex) {
				bestMatchIndex = index;
			}
		};

		for (const part of parts) {
			if (!currentNode) {
				break;
			}

			const wildcardNode = currentNode["*"];
			if (
				wildcardNode &&
				typeof wildcardNode === "object" &&
				wildcardNode._end_ !== undefined
			) {
				updateBestMatch(wildcardNode._end_ as number);
			}

			const nextNode = currentNode[part];
			if (typeof nextNode !== "object" || nextNode === null) {
				break;
			}

			currentNode = nextNode as TrieNode;

			if (currentNode._end_ !== undefined) {
				updateBestMatch(currentNode._end_);
			}
		}

		return bestMatchIndex;
	};
};
