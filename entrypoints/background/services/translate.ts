export const createTranslateService = async (): Promise<TranslateService> => {
	return {
		unary: async (ctx, options, text) => {
			throw "Not implemented";
		},
		stream: async function* (ctx, options, text) {
			yield "";
			throw "Not implemented";
		},
		clearCache: async () => {
			throw "Not implemented";
		},
	};
};
