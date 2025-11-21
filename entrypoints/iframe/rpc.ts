import type { IframeServices } from "@/utils/rpc";
import { IFRAME_AUDIO_CHANNEL } from "@/utils/rpc/iframe-def";
import type { Server } from "~/utils/rpc/factory";
import { setupIframeServer } from "~/utils/rpc/iframe";

const audio = new Audio();
audio.preload = "auto";

type ListenerDisposer = () => void;

let resolvePromise: (() => void) | null = null;
let rejectPromise: ((error: Error) => void) | null = null;
let removeMediaListeners: ListenerDisposer | null = null;

const resetAudioElement = () => {
	audio.pause();
	audio.currentTime = 0;
};

const clearPlaybackState = () => {
	removeMediaListeners?.();
	removeMediaListeners = null;
	resolvePromise = null;
	rejectPromise = null;
};

const settlePlayback = (type: "resolve" | "reject", error?: Error) => {
	const resolve = resolvePromise;
	const reject = rejectPromise;
	clearPlaybackState();
	resetAudioElement();
	if (type === "resolve" && resolve) {
		resolve();
	} else if (type === "reject" && reject) {
		reject(error ?? new Error("Audio playback failed."));
	}
};

const stopPlayback = () => {
	if (resolvePromise) {
		settlePlayback("resolve");
	} else {
		resetAudioElement();
	}
};

const createPlaybackPromise = (url: string): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		resolvePromise = resolve;
		rejectPromise = reject;

		const handleEnded = () => {
			settlePlayback("resolve");
		};

		const handleError = () => {
			const mediaError = audio.error;
			const err =
				mediaError instanceof MediaError
					? new Error(mediaError.message)
					: new Error("Audio playback failed.");
			settlePlayback("reject", err);
		};

		removeMediaListeners = () => {
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
		};

		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);

		audio.src = url;
		audio.load();
		const playPromise = audio.play();
		if (playPromise && typeof playPromise.catch === "function") {
			playPromise.catch((error) => {
				const err =
					error instanceof Error
						? error
						: new Error("Audio playback could not start.");
				settlePlayback("reject", err);
			});
		}
	});
};

const audioService: Server<IframeServices> = {
	async play(url: string) {
		if (!url) {
			throw new Error("Audio source is required.");
		}
		stopPlayback();
		return createPlaybackPromise(url);
	},
	async stop() {
		stopPlayback();
	},
};

setupIframeServer(audioService, { channel: IFRAME_AUDIO_CHANNEL });
