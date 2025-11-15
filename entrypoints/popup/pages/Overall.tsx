import { trackStore } from "@solid-primitives/deep";
import { Power, PowerOff } from "lucide-solid";
import { unwrap } from "solid-js/store";
import { ButtonGroup } from "@/components/settings/ButtonGroup";

export default () => {
	const { settings, setSettings } = useSettings();

	const enabled = () => settings.basic.enabled;

	const modelList = createMemo(() => {
		trackStore(settings.services);
		const llmServices = unwrap(settings.services.llmServices);
		const traditionalServices = unwrap(settings.services.traditionalServices);

		const options = [
			{ value: "", label: t("settings.translation.noModel"), disabled: false },
		];
		Object.entries(llmServices).forEach(([uuid, service]) => {
			options.push({
				value: uuid,
				label: service.name,
				disabled: false,
			});
		});
		Object.entries(traditionalServices).forEach(([uuid, service]) => {
			options.push({
				value: uuid,
				label: service.name,
				disabled: false,
			});
		});

		return options;
	});

	return (
		<div class="flex-1 flex flex-col gap-2">
			<Button
				class="w-full"
				variant={enabled() ? "success" : "neutral"}
				on:click={() => setSettings("basic", "enabled", (v) => !v)}
			>
				{enabled() ? <Power size={16} /> : <PowerOff size={16} />}
				{enabled() ? t("common.enabled") : t("common.disabled")}
			</Button>
			<Card.Root class="w-full" variant="border">
				<Card.Body>
					<Card.Title class="text-sm">
						{t("settings.translation.modelSettings")}
					</Card.Title>
					<div class="grid grid-cols-2 gap-2">
						<select
							class="select select-sm"
							on:change={(e) => {
								setSettings(
									"translate",
									"inTextTranslateModel",
									e.target.value || undefined,
								);
							}}
						>
							<option disabled>
								{t("settings.translation.inTextTranslateModel")}
							</option>
							<For each={modelList()}>
								{(option) => (
									<option
										value={option.value}
										selected={
											option.value === settings.translate.inTextTranslateModel
										}
									>
										{option.label}
									</option>
								)}
							</For>
						</select>
						<select
							class="select select-sm"
							on:change={(e) =>
								setSettings(
									"translate",
									"floatingTranslateModel",
									e.target.value || undefined,
								)
							}
						>
							<option disabled>
								{t("settings.translation.floatingTranslateModel")}
							</option>
							<For each={modelList()}>
								{(option) => (
									<option
										value={option.value}
										selected={
											option.value === settings.translate.floatingTranslateModel
										}
									>
										{option.label}
									</option>
								)}
							</For>
						</select>
					</div>
				</Card.Body>
			</Card.Root>
			<Card.Root class="w-full" variant="border">
				<Card.Body>
					<Card.Title class="text-sm">
						{t("settings.translation.translationSettings")}
					</Card.Title>
					<div class="grid grid-cols-2 gap-2">
						<ButtonGroup
							options={[
								{
									value: "full",
									label: t("settings.translation.fullPage"),
								},
								{
									value: "visible",
									label: t("settings.translation.visible"),
								},
							]}
							value={settings.translate.translateFullPage ? "full" : "visible"}
							onChange={(value) =>
								setSettings("translate", "translateFullPage", value === "full")
							}
						/>
						<ButtonGroup
							options={[
								{
									value: "parallel",
									label: t("settings.translation.modeParallel"),
								},
								{
									value: "replace",
									label: t("settings.translation.modeReplace"),
								},
							]}
							value={settings.translate.translationMode}
							onChange={(value) =>
								setSettings(
									"translate",
									"translationMode",
									value as "parallel" | "replace",
								)
							}
						/>
					</div>
				</Card.Body>
			</Card.Root>
		</div>
	);
};
