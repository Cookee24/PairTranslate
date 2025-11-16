import type { MatchService } from "@/utils/rpc";

export const createMatchService = (): MatchService => {
	const parserMatcher = makeDomainMatcher(PARSER_PATTERNS);

	return {
		matchParser: async (domain: string): Promise<number | null> => {
			return parserMatcher(domain);
		},
		matchWebsite: async (domain: string): Promise<number | null> => {
			throw new Error("Function not implemented.");
		},
	};
};
