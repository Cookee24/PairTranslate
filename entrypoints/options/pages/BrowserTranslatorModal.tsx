import {
	ArrowRight,
	Check,
	CheckCheck,
	CheckCircle2,
	CloudDownload,
	Download,
	Plus,
	X,
} from "lucide-solid";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { Alert } from "~/components/Alert";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { Modal } from "~/components/Modal";
import { useSettings } from "~/hooks/settings";
import {
	checkBrowserTranslationCapabilities,
	type TranslatorCheckResult,
} from "~/utils/browser-translator";
import { SUPPORTED_LANGUAGES } from "~/utils/constants";
import { t } from "~/utils/i18n";
import type { ServiceSettings } from "~/utils/settings";

interface BrowserTranslatorModalProps {
	open?: boolean;
	onClose: () => void;
	onAddService?: (
		config: Extract<ServiceSettings, { type: "traditional" }>,
	) => void;
}

interface LanguagePair {
	source: string;
	target: string;
	sourceName: string;
	targetName: string;
}

// Generate language pairs from SUPPORTED_LANGUAGES
const generateLanguagePairs = (): LanguagePair[] => {
	const pairs: LanguagePair[] = [];
	const commonLangs = ["en", "zh-CN", "ja", "es", "fr", "de", "ko", "pt"];

	for (const source of commonLangs) {
		for (const target of commonLangs) {
			if (source !== target) {
				const sourceLang = SUPPORTED_LANGUAGES.find((l) => l.code === source);
				const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === target);
				if (sourceLang && targetLang) {
					pairs.push({
						source,
						target,
						sourceName: sourceLang.name,
						targetName: targetLang.name,
					});
				}
			}
		}
	}

	return pairs;
};

const COMMON_LANGUAGE_PAIRS = generateLanguagePairs();

export default (props: BrowserTranslatorModalProps) => {
	const { settings } = useSettings();
	const [isChecking, setIsChecking] = createSignal(false);
	const [currentStep, setCurrentStep] = createSignal(0);
	const [translatorResults, setTranslatorResults] = createSignal<
		Map<string, TranslatorCheckResult>
	>(new Map());
	const [languageDetectorResult, setLanguageDetectorResult] = createSignal<{
		isSupported: boolean;
		availability?: string;
		error?: string;
	} | null>(null);

	// Check if browser translator service already exists
	const hasBrowserService = createMemo(() =>
		(Object.values(settings.services) as ServiceSettings[]).some(
			(service) =>
				service.type === "traditional" && service.apiSpec === "browser",
		),
	);

	const checkCapabilities = async () => {
		setIsChecking(true);
		setCurrentStep(0);

		try {
			// Step 1: Check Language Detector
			setCurrentStep(1);
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Step 2: Check Translator capabilities
			setCurrentStep(2);
			const results = await checkBrowserTranslationCapabilities(
				COMMON_LANGUAGE_PAIRS,
			);

			setTranslatorResults(results.translator);
			setLanguageDetectorResult(results.languageDetector);

			// Step 3: Complete
			setCurrentStep(3);
		} catch (error) {
			console.error("Error checking browser translation capabilities:", error);
		} finally {
			setIsChecking(false);
		}
	};

	createEffect(() => props.open && checkCapabilities());

	const handleAddBrowserService = () => {
		if (!props.onAddService) return;

		const config: Extract<ServiceSettings, { type: "traditional" }> = {
			type: "traditional",
			name: t("settings.browserTranslator.serviceName"),
			apiSpec: "browser",
		};

		props.onAddService(config);
		props.onClose();
	};

	const getAvailabilityIcon = (availability?: string) => {
		switch (availability) {
			case "available":
				return <Check size={16} />;
			case "downloadable":
			case "downloading":
				return <Download size={16} />;
			case "unavailable":
				return <X size={16} />;
		}
	};

	const renderStatusBadge = (result?: TranslatorCheckResult) => {
		if (result?.isSupported && result.availability === "available") {
			return (
				<Badge variant="success" class="gap-2 text-white">
					<CheckCircle2 size={12} />
					{t("settings.browserTranslator.status.supported")}
				</Badge>
			);
		}

		if (
			result?.availability === "downloadable" ||
			result?.availability === "downloading"
		) {
			return (
				<Badge variant="warning" class="gap-2 text-base-content">
					<CloudDownload size={12} />
					{t("settings.browserTranslator.availability.downloadable")}
				</Badge>
			);
		}

		return (
			<Badge variant="error" class="gap-2 text-white">
				<X size={12} />
				{t("settings.browserTranslator.status.unsupported")}
			</Badge>
		);
	};

	const renderActionCell = (result?: TranslatorCheckResult) => {
		if (result?.availability === "available") {
			return (
				<span class="text-xs font-semibold uppercase tracking-wide text-success">
					{t("common.enabled")}
				</span>
			);
		}

		if (
			result?.availability === "downloadable" ||
			result?.availability === "downloading"
		) {
			return (
				<Button
					type="button"
					variant="ghost"
					size="xs"
					class="btn-outline gap-1"
					title={t("settings.browserTranslator.availability.downloadable")}
					disabled
				>
					<CloudDownload size={12} />
					{t("settings.browserTranslator.availability.downloadable")}
				</Button>
			);
		}

		return (
			<span class="text-xs text-base-content/50">
				{t("settings.browserTranslator.availability.unavailable")}
			</span>
		);
	};

	const renderSteps = () => {
		const steps = [
			{ label: t("settings.browserTranslator.steps.initialize") },
			{ label: t("settings.browserTranslator.steps.checkDetector") },
			{ label: t("settings.browserTranslator.steps.checkTranslator") },
			{ label: t("settings.browserTranslator.steps.complete") },
		];

		return (
			<ul class="steps steps-vertical w-full mb-6">
				<For each={steps}>
					{(step, index) => (
						<li class={`step ${index() < currentStep() ? "step-primary" : ""}`}>
							{step.label}
						</li>
					)}
				</For>
			</ul>
		);
	};

	return (
		<Modal
			open={props.open}
			onClose={props.onClose}
			title={t("settings.browserTranslator.title")}
			backdrop
			boxClass="max-w-4xl"
			actions={
				<div class="flex items-center gap-2">
					<Button variant="ghost" onClick={props.onClose}>
						{t("common.close")}
					</Button>
					<Button
						variant="primary"
						onClick={checkCapabilities}
						disabled={isChecking()}
						loading={isChecking()}
					>
						{t("settings.browserTranslator.recheck")}
					</Button>
					<Show when={props.onAddService && !isChecking()}>
						<Button
							variant="success"
							onClick={handleAddBrowserService}
							disabled={
								hasBrowserService() ||
								Array.from(translatorResults().values()).every(
									(r) =>
										!r.isSupported ||
										(r.availability !== "available" &&
											r.availability !== "downloadable"),
								)
							}
						>
							{hasBrowserService() ? (
								<>
									<CheckCheck size={16} />
									{t("settings.browserTranslator.alreadyAdded")}
								</>
							) : (
								<>
									<Plus size={16} />
									{t("settings.browserTranslator.addService")}
								</>
							)}
						</Button>
					</Show>
				</div>
			}
		>
			<div class="space-y-6 max-h-80vh">
				{/* Info Alert */}
				<Alert variant="info">
					<span>{t("settings.browserTranslator.description")}</span>
				</Alert>

				{/* Progress Steps */}
				<Show when={isChecking()}>{renderSteps()}</Show>

				{/* Language Detector Results */}
				<Show when={!isChecking() && languageDetectorResult()}>
					<div class="border border-base-300 rounded-box p-4">
						<h3 class="font-semibold text-lg mb-3 flex items-center gap-2">
							{t("settings.browserTranslator.languageDetector")}
							{languageDetectorResult()?.isSupported
								? getAvailabilityIcon(languageDetectorResult()?.availability)
								: null}
						</h3>
						<div class="space-y-2">
							<p>
								<strong>{t("settings.browserTranslator.status.label")}:</strong>{" "}
								<span
									class={
										languageDetectorResult()?.isSupported
											? "text-success"
											: "text-error"
									}
								>
									{languageDetectorResult()?.isSupported
										? t("settings.browserTranslator.status.supported")
										: t("settings.browserTranslator.status.unsupported")}
								</span>
							</p>
							<Show when={languageDetectorResult()?.availability}>
								<p>
									<strong>
										{t("settings.browserTranslator.availability.label")}:
									</strong>{" "}
									{(() => {
										const availability = languageDetectorResult()?.availability;
										if (availability === "available") {
											return t(
												"settings.browserTranslator.availability.available",
											);
										}
										if (availability === "downloadable") {
											return t(
												"settings.browserTranslator.availability.downloadable",
											);
										}
										if (availability === "downloading") {
											return t(
												"settings.browserTranslator.availability.downloading",
											);
										}
										return t(
											"settings.browserTranslator.availability.unavailable",
										);
									})()}
								</p>
							</Show>
							<Show when={languageDetectorResult()?.error}>
								<p class="text-error text-sm">
									{languageDetectorResult()?.error}
								</p>
							</Show>
						</div>
					</div>
				</Show>

				{/* Translator Results */}
				<Show when={!isChecking() && translatorResults().size > 0}>
					<div class="space-y-3">
						<h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">
							{t("settings.browserTranslator.translator")}
						</h3>
						<div class="overflow-x-auto h-96 rounded-box border border-base-300">
							<table class="table table-pin-rows">
								<thead class="bg-base-200">
									<tr>
										<th class="text-sm font-semibold">
											{t("settings.browserTranslator.table.languagePair")}
										</th>
										<th class="text-sm font-semibold">
											{t("settings.browserTranslator.table.status")}
										</th>
										<th class="text-right text-sm font-semibold">
											{t("settings.browserTranslator.table.availability")}
										</th>
									</tr>
								</thead>
								<tbody>
									<For each={COMMON_LANGUAGE_PAIRS}>
										{(pair) => {
											const key = `${pair.source}-${pair.target}`;
											const result = translatorResults().get(key);
											return (
												<tr class="hover">
													<td>
														<div class="flex items-center gap-2 font-medium">
															<span>{pair.sourceName}</span>
															<ArrowRight class="h-3 w-3 opacity-50" />
															<span>{pair.targetName}</span>
														</div>
													</td>
													<td>{renderStatusBadge(result)}</td>
													<td class="text-right">
														<div class="flex justify-end">
															{renderActionCell(result)}
														</div>
														<Show when={result?.error}>
															<span class="text-error text-[11px]">
																{result?.error}
															</span>
														</Show>
													</td>
												</tr>
											);
										}}
									</For>
								</tbody>
							</table>
						</div>
					</div>
				</Show>

				{/* Help Text */}
				<div class="text-sm text-base-content/70">
					<p>{t("settings.browserTranslator.helpText")}</p>
					<a
						href="https://developer.mozilla.org/en-US/docs/Web/API/Translator_and_Language_Detector_APIs"
						target="_blank"
						rel="noopener noreferrer"
						class="link link-primary mt-2 inline-block"
					>
						{t("settings.browserTranslator.learnMore")}
					</a>
				</div>
			</div>
		</Modal>
	);
};
