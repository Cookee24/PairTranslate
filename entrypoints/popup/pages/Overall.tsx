import { trackStore } from "@solid-primitives/deep";
import { Link, Power, PowerOff, Trash2 } from "lucide-solid";
import { createMemo, createResource, For } from "solid-js";
import { unwrap } from "solid-js/store";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { ButtonGroup } from "~/components/settings/ButtonGroup";
import { createDomainEnabledTimer } from "~/hooks/domain-timer";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import { selectServicesByType } from "~/utils/settings/services";
import { getCurrentDomain } from "../get-current";

export default () => {
	const { settings, setSettings } = useSettings();

	const enabled = () => settings.basic.enabled;

	const [domain] = createResource(getCurrentDomain);
	const [remaining, setTimer] = createDomainEnabledTimer(() => domain() || "");

	const remainingDisplay = createMemo(() => {
		const rem = remaining();
		if (rem === undefined) return "";
		if (rem < 60) {
			return t("popup.domainTimer.remainingSeconds", [
				Math.max(1, Math.ceil(rem)).toString(),
			]);
		}
		if (rem < 3600) {
			return t("popup.domainTimer.remainingMinutes", [
				Math.max(1, Math.ceil(rem / 60)).toString(),
			]);
		}
		if (rem < 3600 * 24) {
			return t("popup.domainTimer.remainingHours", [
				Math.max(1, Math.ceil(rem / 3600)).toString(),
			]);
		}
		return t("popup.domainTimer.untilClose");
	});
	const timerOptions = createMemo(() => [
		{ value: "close", label: t("popup.domainTimer.closeBrowser") },
		{
			value: `${5 * 60}`,
			label: t("popup.domainTimer.afterMinutes", ["5"]),
		},
		{
			value: `${15 * 60}`,
			label: t("popup.domainTimer.afterMinutes", ["15"]),
		},
		{
			value: `${30 * 60}`,
			label: t("popup.domainTimer.afterMinutes", ["30"]),
		},
		{
			value: `${60 * 60}`,
			label: t("popup.domainTimer.afterHours", ["1"]),
		},
		{
			value: `${3 * 60 * 60}`,
			label: t("popup.domainTimer.afterHours", ["3"]),
		},
	]);

	const modelList = createMemo(() => {
		trackStore(settings.services);
		const services = unwrap(settings.services);
		const llmServices = selectServicesByType(services, "llm");
		const traditionalServices = selectServicesByType(services, "traditional");

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
			<Card.Root class="w-full" variant="border">
				<Card.Body>
					<span class="flex items-center gap-2">
						<Link class="inline" size={16} />
						<span class="font-mono text-sm">
							{(domain() || "").split(".").slice(-2).join(".")}
						</span>
					</span>
					<div class="flex gap-2 items-center">
						<span class="text-sm font-bold">
							{t("popup.domainTimer.keepUntil")}
						</span>
						<select
							id="domain-timer-select"
							class="select select-sm max-w-32"
							on:change={(e) => {
								const value = e.target.value;
								switch (value) {
									case "close":
										setTimer(1e99);
										break;
									case "":
										break;
									default:
										setTimer(parseInt(value, 10));
										break;
								}
							}}
						>
							<option value="" disabled selected>
								{remainingDisplay() || t("popup.domainTimer.selectPlaceholder")}
							</option>
							<For each={timerOptions()}>
								{(option) => (
									<option value={option.value}>{option.label}</option>
								)}
							</For>
						</select>
						<Button
							class="ml-auto"
							size="xs"
							variant="error"
							on:click={() => setTimer(0)}
							disabled={remaining() === undefined}
						>
							<Trash2 size={16} />
						</Button>
					</div>
				</Card.Body>
			</Card.Root>
		</div>
	);
};
