import { createMatchService } from "./services/match";
import { createStyleService } from "./services/style";
// TODO: implement this
import { createTranslateService } from "./services/translate";

export const setRpc = async () => {
	const translateService = await createTranslateService();
	const styleService = createStyleService();
	const matchService = createMatchService();

	const clientImpl: Server<AllServices> = {
		ping: async () => "pong",

		unary: translateService.unary,
		stream: translateService.stream,
		batch: translateService.batch,
		clearCache: translateService.clearCache,
		getContentStyles: styleService.getContentStyles,

		matchParser: matchService.matchParser,
		matchWebsiteRule: matchService.matchWebsiteRule,
	};

	setupWxtServer(clientImpl, WXT_TRANSPORTATION_NAME);
};
