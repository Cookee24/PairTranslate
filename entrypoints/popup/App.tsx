import { Settings } from "lucide-solid";

const Content = () => {
	const { settings, setSettings } = useSettings();
	const enabled = () => settings.basic.enabled;
	const translationMode = () => settings.translate.translationMode;

	return (
		<>
			<div
				class={
					"flex flex-col items-center gap-2 p-4 rounded transition-colors duration-200" +
					(enabled() ? " bg-success" : " bg-error")
				}
			>
				<Toggle
					variant="primary"
					checked={enabled()}
					onChange={(e) => setSettings("basic", "enabled", e.target.checked)}
				/>
				<span class="text-xl text-primary-content">
					{enabled() ? t("common.enabled") : t("common.disabled")}
				</span>
			</div>
			<div class="join">
				<Button
					size="sm"
					variant={translationMode() === "parallel" ? "primary" : "ghost"}
					class="join-item flex-1"
					classList={{ "btn-active": translationMode() === "parallel" }}
					onClick={() =>
						setSettings("translate", "translationMode", "parallel")
					}
				>
					{t("settings.translation.modeParallel")}
				</Button>
				<Button
					size="sm"
					variant={translationMode() === "replace" ? "primary" : "ghost"}
					class="join-item flex-1"
					classList={{ "btn-active": translationMode() === "replace" }}
					onClick={() => setSettings("translate", "translationMode", "replace")}
				>
					{t("settings.translation.modeReplace")}
				</Button>
			</div>
			<Button
				variant="secondary"
				onClick={() => browser.runtime.openOptionsPage()}
			>
				<Settings />
				{t("settings.title")}
			</Button>
		</>
	);
};

export default () => {
	return (
		<SettingsProvider>
			<Content />
		</SettingsProvider>
	);
};
