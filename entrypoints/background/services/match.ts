export const createMatchService = (): MatchService => {
	const parserMatcher = makeDomainMatcher(PARSER_PATTERNS);
	let websiteRuleMatcher = (_domain: string): number | null => {
		// Shouldn't be so fast called
		throw "Matcher not ready yet";
	};

	listenSettings((settings) => {
		const websiteRulePatterns = settings.websiteRules.flatMap(
			(websiteRule) => websiteRule.urlPatterns,
		);
		const patternsIdxToWebsiteRuleIdx = websiteRulePatterns.flatMap(
			(pattern, index) => Array(pattern.length).fill(index),
		);

		const matcher = makeDomainMatcher(websiteRulePatterns);
		websiteRuleMatcher = (domain: string) => {
			const result = matcher(domain);
			return result === null ? null : patternsIdxToWebsiteRuleIdx[result];
		};
	});

	return {
		matchParser: async (domain: string): Promise<number | null> => {
			const result = parserMatcher(domain);
			return result === null ? null : PATTERNS_IDX_TO_PARSER_IDX[result];
		},
		matchWebsiteRule: async (domain: string): Promise<number | null> => {
			return websiteRuleMatcher(domain);
		},
	};
};
