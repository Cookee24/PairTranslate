import {
	BookOpen,
	Earth,
	Languages,
	ListCheck,
	Play,
	RotateCcw,
} from "lucide-solid";
import {
	createMemo,
	createSignal,
	For,
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import { useSettings } from "~/hooks/settings";
import { createTranslation } from "~/hooks/translation";
import { PROMPT_ID } from "~/utils/constants";
import type { DictionaryEntry } from "~/utils/dictionary";
import { t } from "~/utils/i18n";
import { getIframeClient } from "~/utils/rpc/iframe-def";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Loading } from "./Loading";
import { MdStyled } from "./MD";
import { Menu } from "./Menu";

const formatMeaningsAsMarkdown = (
	meanings: DictionaryEntry["meanings"],
): string => {
	if (!meanings?.length) return "";

	return meanings
		.map((meaning, meaningIndex) => {
			const header = meaning.partOfSpeech
				? `## ${meaning.partOfSpeech}`
				: `## ${t("dictionary.labels.meaning", [String(meaningIndex + 1)])}`;
			const definitions = meaning.definitions
				.map((definition, defIndex) => {
					const lines = [`${defIndex + 1}. ${definition.definition}`];
					if (definition.example) {
						lines.push(
							`   - ${t("dictionary.labels.example")}: ${definition.example}`,
						);
					}
					if (definition.synonyms.length) {
						lines.push(
							`   - ${t("dictionary.labels.synonyms")}: ${definition.synonyms.map((synonym) => `\`${synonym}\``).join(", ")}`,
						);
					}
					if (definition.antonyms.length) {
						lines.push(
							`   - ${t("dictionary.labels.antonyms")}: ${definition.antonyms.map((antonym) => `\`${antonym}\``).join(", ")}`,
						);
					}
					return lines.join("\n");
				})
				.filter(Boolean)
				.join("\n");

			const extras: string[] = [];
			if (meaning.synonyms.length) {
				extras.push(
					`${t("dictionary.labels.synonyms")}: ${meaning.synonyms.map((synonym) => `\`${synonym}\``).join(", ")}`,
				);
			}
			if (meaning.antonyms.length) {
				extras.push(
					`${t("dictionary.labels.antonyms")}: ${meaning.antonyms.map((antonym) => `\`${antonym}\``).join(", ")}`,
				);
			}

			return [header, definitions, extras.join("\n")]
				.filter(Boolean)
				.join("\n\n");
		})
		.join("\n\n")
		.trim();
};

export default (props: DictionaryEntry) => {
	const { settings } = useSettings();
	const [section, setSection] = createSignal<"overview" | "definitions">(
		"overview",
	);
	const [playing, setPlaying] = createSignal<number | null>(null);
	const [shouldTranslate, setShouldTranslate] = createSignal(false);
	const markdownPayload = createMemo(() =>
		formatMeaningsAsMarkdown(props.meanings),
	);
	const [translation, retryTranslation] = createTranslation(
		() => (shouldTranslate() ? markdownPayload() : ""),
		{
			ctx: () => ({
				word: props.word,
			}),
			promptId: PROMPT_ID.dictionaryTranslate,
			modelId: () =>
				settings.translate.floatingTranslateModel ??
				settings.translate.inTextTranslateModel,
			srcLang: () => settings.translate.sourceLang,
			dstLang: () => settings.translate.targetLang,
			stream: true,
		},
	);
	const translatedText = () => {
		const value = translation();
		return typeof value === "string" ? value : "";
	};

	const audioClientPromise = getIframeClient();
	let playbackToken = 0;
	const playPronunciation = async (
		audioUrl: string | undefined,
		index: number,
	) => {
		if (!audioUrl) return;
		try {
			const client = await audioClientPromise;
			if (playing() === index) {
				playbackToken++;
				setPlaying(null);
				await client.stop();
				return;
			}
			const currentToken = ++playbackToken;
			setPlaying(index);
			try {
				await client.play(audioUrl);
			} finally {
				if (playbackToken === currentToken) {
					setPlaying(null);
				}
			}
		} catch (error) {
			console.error("Failed to play pronunciation audio.", error);
			setPlaying(null);
		}
	};

	onCleanup(() => {
		audioClientPromise.then((client) => client.stop()).catch(() => {});
	});

	const handleTranslateMeanings = () => {
		if (!markdownPayload()) return;
		if (shouldTranslate()) {
			retryTranslation();
			return;
		}
		setShouldTranslate(true);
	};

	const handleClearTranslation = () => {
		if (translation.loading) return;
		setShouldTranslate(false);
	};

	return (
		<div class="flex gap-1">
			<Menu.Root size="sm">
				<Menu.Item>
					<Button
						class="tooltip tooltip-right"
						variant={section() === "overview" ? "primary" : "ghost"}
						size="xs"
						data-tip={t("dictionary.tabs.overview")}
						onClick={() => setSection("overview")}
					>
						<BookOpen size={16} />
					</Button>
				</Menu.Item>
				<Menu.Item>
					<Button
						class="tooltip tooltip-right"
						variant={section() === "definitions" ? "primary" : "ghost"}
						size="xs"
						data-tip={t("dictionary.tabs.definitions")}
						onClick={() => setSection("definitions")}
					>
						<ListCheck size={16} />
					</Button>
				</Menu.Item>
			</Menu.Root>
			<div class="flex-1">
				<Switch>
					<Match when={section() === "overview"}>
						<div class="flex flex-col gap-2">
							<div>
								<p class="text-xl font-bold text-base-content">{props.word}</p>
								<Show when={props.phonetic}>
									{(phonetic) => (
										<p class="text-xs font-mono text-base-content/70">
											{phonetic()}
										</p>
									)}
								</Show>
							</div>
							<Show when={props.phonetics?.length}>
								<div class="flex flex-col gap-1">
									<For each={props.phonetics}>
										{(item, index) => (
											<div class="flex items-center gap-1 rounded-field p-2">
												<Button
													class="btn-circle"
													size="xs"
													variant={playing() === index() ? "primary" : "ghost"}
													onClick={() =>
														void playPronunciation(item.audio, index())
													}
													disabled={!item.audio}
												>
													<Play size={10} />
												</Button>
												<div class="flex flex-col gap-0.5 flex-1 min-w-0">
													<Show when={item.text}>
														{(text) => (
															<span class="font-mono text-xs text-base-content/80 truncate">
																{text()}
															</span>
														)}
													</Show>
													<Show when={item.sourceUrl}>
														{(url) => (
															<a
																href={url()}
																target="_blank"
																rel="noreferrer"
																class="text-xs text-primary truncate"
															>
																{t("dictionary.labels.source")}
															</a>
														)}
													</Show>
												</div>
											</div>
										)}
									</For>
								</div>
							</Show>
							<Show when={props.sourceUrls?.length}>
								<div class="flex items-center gap-1">
									<For each={props.sourceUrls}>
										{(url) => (
											<Button
												class="btn-circle tooltip tooltip-top"
												size="xs"
												on:click={() => {
													const a = document.createElement("a");
													a.href = url;
													a.target = "_blank";
													a.rel = "noreferrer";
													a.click();
												}}
											>
												<div class="tooltip-content max-w-32 break-all">
													{url.replace(/^https?:\/\//i, "")}
												</div>
												<Earth size={12} />
											</Button>
										)}
									</For>
								</div>
							</Show>
						</div>
					</Match>
					<Match when={section() === "definitions"}>
						<div class="flex flex-col gap-2">
							<div class="flex items-center gap-2 rounded-field bg-base-200/30 p-2">
								<p class="text-xs font-semibold uppercase tracking-wide text-base-content/70">
									{t("dictionary.sections.meanings")}
								</p>
								<div class="flex gap-1 ml-auto">
									<Button
										class="tooltip"
										variant="primary"
										size="xs"
										disabled={
											shouldTranslate() &&
											(translation.loading || translation.streaming)
										}
										onClick={handleTranslateMeanings}
										data-tip={
											shouldTranslate()
												? t("common.retry")
												: t("actions.translate")
										}
									>
										<Switch>
											<Match
												when={
													shouldTranslate() &&
													(translation.loading || translation.streaming)
												}
											>
												<Loading size="xs" />
											</Match>
											<Match when={!shouldTranslate()}>
												<Languages size={12} />
											</Match>
											<Match when={shouldTranslate()}>
												<RotateCcw size={12} />
											</Match>
										</Switch>
									</Button>
									<Show when={shouldTranslate()}>
										<Button
											variant="ghost"
											size="xs"
											onClick={handleClearTranslation}
										>
											{t("common.clear")}
										</Button>
									</Show>
								</div>
							</div>

							<Show when={shouldTranslate()}>
								<div class="rounded-box bg-primary/5 p-2">
									<Show when={translation.error}>
										{(error) => (
											<div class="flex items-center gap-2 text-xs text-error">
												<span class="flex-1">{error().message}</span>
												<Button
													variant="ghost"
													size="xs"
													onClick={retryTranslation}
												>
													<RotateCcw size={12} />
												</Button>
											</div>
										)}
									</Show>
									<Show
										when={
											!translation.error &&
											(translation.loading || translation.streaming)
										}
									>
										<div class="flex items-center gap-1 text-xs text-base-content/70">
											<Loading size="xs" variant="primary" />
											{t("common.processing")}
										</div>
									</Show>
									<MdStyled text={translatedText()} />
								</div>
							</Show>

							<Show when={!shouldTranslate()}>
								<Show when={!props.meanings?.length}>
									<div class="rounded-box p-3 text-center text-xs text-base-content/70">
										{t("dictionary.messages.noDefinitions")}
									</div>
								</Show>

								<For each={props.meanings}>
									{(meaning, meaningIndex) => (
										<section
											class="space-y-2 rounded-box p-2"
											aria-label={t("dictionary.labels.meaning", [
												String(meaningIndex() + 1),
											])}
										>
											<header class="flex items-baseline gap-2">
												<span class="text-xs font-semibold uppercase tracking-wide text-primary">
													{meaning.partOfSpeech ||
														t("dictionary.labels.meaningShort", [
															String(meaningIndex() + 1),
														])}
												</span>
												<span class="text-xs text-base-content/60">
													({meaning.definitions.length})
												</span>
											</header>
											<ol class="space-y-1 pl-3 text-sm">
												<For each={meaning.definitions}>
													{(definition, defIndex) => (
														<li class="space-y-1">
															<div class="text-base-content">
																{defIndex() + 1}. {definition.definition}
															</div>
															<Show when={definition.example}>
																<p class="text-xs italic text-base-content/70">
																	{t("dictionary.labels.examplePrefix")}:{" "}
																	{definition.example}
																</p>
															</Show>
															<Show when={definition.synonyms.length}>
																<div class="flex flex-wrap gap-0.5 text-xs text-base-content/70">
																	<For each={definition.synonyms}>
																		{(word) => (
																			<Badge size="xs" variant="ghost">
																				{word}
																			</Badge>
																		)}
																	</For>
																</div>
															</Show>
															<Show when={definition.antonyms.length}>
																<div class="flex flex-wrap gap-0.5 text-xs text-base-content/70">
																	<For each={definition.antonyms}>
																		{(word) => (
																			<Badge size="xs" variant="ghost">
																				{word}
																			</Badge>
																		)}
																	</For>
																</div>
															</Show>
														</li>
													)}
												</For>
											</ol>
											<Show
												when={
													meaning.synonyms.length || meaning.antonyms.length
												}
											>
												<div class="flex flex-col gap-0.5 text-xs text-base-content/70">
													<Show when={meaning.synonyms.length}>
														<div class="flex flex-wrap gap-0.5">
															<For each={meaning.synonyms}>
																{(word) => (
																	<Badge size="xs" variant="secondary" outline>
																		{word}
																	</Badge>
																)}
															</For>
														</div>
													</Show>
													<Show when={meaning.antonyms.length}>
														<div class="flex flex-wrap gap-0.5">
															<For each={meaning.antonyms}>
																{(word) => (
																	<Badge size="xs" variant="warning" outline>
																		{word}
																	</Badge>
																)}
															</For>
														</div>
													</Show>
												</div>
											</Show>
										</section>
									)}
								</For>
							</Show>
						</div>
					</Match>
				</Switch>
			</div>
		</div>
	);
};
