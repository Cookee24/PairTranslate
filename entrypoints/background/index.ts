import { browser, defineBackground } from "#imports";
import { OPEN_TRANSLATOR_POPUP_COMMAND } from "@/utils/constants";
import { WXT_TRANSPORTATION_NAME } from "~/utils/constants";
import { cleanupDomainTimers } from "~/utils/domain-timers";
import { type AllServices, type Server, setupWxtServer } from "~/utils/rpc";
import { initializeSettings } from "~/utils/settings/helper";
import { openTranslatorPopup } from "~/utils/translator-window";
import { createDictionaryService } from "./services/dictionary";
import { createMatchService } from "./services/match";
import { createStyleService } from "./services/style";
import { createTranslateService } from "./services/translate";

export default defineBackground(() => {
	console.log("Pair Translate background script loaded", {
		id: browser.runtime.id,
	});

	let ready = false;
	const promise = async () => {
		if (ready) return;

		await initializeSettings();

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
		ready = true;
	};

	// If there is no active session, background scripts will be killed.
	// So we should check if the RPC is ready before responding.
	browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
		(async () => {
			if (msg === "ping") {
				await promise();
				sendResponse("pong");
			}
		})();

		return true;
	});

	browser.commands.onCommand.addListener((command) => {
		if (command === OPEN_TRANSLATOR_POPUP_COMMAND) {
			openTranslatorPopup().catch((error) => {
				console.error("Failed to open translator popup via command", {
					error,
				});
			});
		}
	});

	browser.runtime.onStartup.addListener(() => {
		cleanupDomainTimers();
	});
});
