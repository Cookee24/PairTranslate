import { createStyleService } from "./services/style";
import { createTranslateService } from "./services/translate";

export const setRpc = async () => {
	const translateService = await createTranslateService();
	const styleService = createStyleService();

	const clientImpl: Server<AllServices> = {
		ping: async () => "pong",

		translate: translateService.translate,
		batchTranslate: translateService.batchTranslate,
		streamTranslate: translateService.streamTranslate,
		explain: translateService.explain,
		streamExplain: translateService.streamExplain,
		streamInputTranslate: translateService.streamInputTranslate,
		clearCache: translateService.clearCache,

		getContentStyles: styleService.getContentStyles,
	};

	setupWxtServer(clientImpl, WXT_TRANSPORTATION_NAME);
};
