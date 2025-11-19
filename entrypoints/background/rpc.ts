import { createDictionaryService } from "./services/dictionary";
import { createMatchService } from "./services/match";
import { createStyleService } from "./services/style";
import { createTranslateService } from "./services/translate";

export const setRpc = async () => {
	const translateService = await createTranslateService();
	const styleService = createStyleService();
	const matchService = createMatchService();
	const dictionaryService = createDictionaryService();

	const clientImpl: Server<AllServices> = {
		ping: async () => "pong",

		unary: translateService.unary,
		stream: translateService.stream,
		batch: translateService.batch,
		clearCache: translateService.clearCache,
		queueStatus: translateService.queueStatus,

		getContentStyles: styleService.getContentStyles,

		matchParser: matchService.matchParser,
		matchWebsiteRule: matchService.matchWebsiteRule,

		lookup: dictionaryService.lookup,
	};

	setupWxtServer(clientImpl, WXT_TRANSPORTATION_NAME);
};
