import { Plus, Trash2 } from "lucide-solid";
import { createEffect, createMemo, For, Show } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { ButtonGroup } from "~/components/settings/ButtonGroup";
import { FormField } from "~/components/settings/FormField";
import type { WebsiteRuleSetting } from "~/utils/settings";

interface Props {
	s: WebsiteRuleSetting;
	index?: number;
}

export const WebsiteRuleEditor = (props: Props) => {
	const [local, setLocal] = createStore<WebsiteRuleSetting>(props.s);

	const { settings, setSettings } = useSettings();
	const [newPattern, setNewPattern] = createStore({ value: "" });
	const [errors, setErrors] = createStore({
		urlPatterns: "" as string,
	});

	// Sync props changes to local state
	createEffect(() => {
		setLocal(reconcile(props.s));
	});

	const sourceLanguageOptions = createMemo<SelectOption[]>(() => [
		{ value: "default", label: "默认" },
		{ value: "", label: t("settings.translation.autoDetect") },
		...SUPPORTED_LANGUAGES.map((lang) => ({
			value: lang.code,
			label: `${lang.nativeName} (${lang.name})`,
		})),
	]);

	const targetLanguageOptions = createMemo<SelectOption[]>(() => [
		{ value: "default", label: "默认" },
		...SUPPORTED_LANGUAGES.map((lang) => ({
			value: lang.code,
			label: `${lang.nativeName} (${lang.name})`,
		})),
	]);

	const handleAddPattern = () => {
		const pattern = newPattern.value.trim();
		if (!pattern) {
			setErrors("urlPatterns", "请输入 URL 模式");
			return;
		}

		if (local.urlPatterns.includes(pattern)) {
			setErrors("urlPatterns", "此模式已存在");
			return;
		}

		setLocal("urlPatterns", [...local.urlPatterns, pattern]);
		setNewPattern("value", "");
		setErrors("urlPatterns", "");
	};

	const handleRemovePattern = (index: number) => {
		setLocal(
			"urlPatterns",
			local.urlPatterns.filter((_, i) => i !== index),
		);
	};

	const isModified = createMemo(() => {
		return JSON.stringify(local) !== JSON.stringify(props.s);
	});

	createEffect(() => {
		if (isModified()) {
			const timeout = setTimeout(() => {
				const index_ = props.index ?? settings.websiteRules.length;

				setSettings("websiteRules", index_, local);
			}, 300);
			onCleanup(() => clearTimeout(timeout));
		}
	});

	return (
		<div class="flex flex-col gap-4 w-full wrap-anywhere">
			{/* URL Patterns Section */}
			<div class="card bg-base-200">
				<div class="card-body gap-4">
					<h3 class="card-title text-lg">URL 模式</h3>
					<p class="text-sm opacity-70">配置此规则适用的网站 URL 模式</p>

					{/* Pattern Input */}
					<div class="flex gap-2">
						<Input
							class="flex-1"
							placeholder="*.example.com 或 example.com"
							value={newPattern.value}
							onInput={(e) => setNewPattern("value", e.currentTarget.value)}
							onKeyPress={(e) => {
								if (e.key === "Enter") {
									handleAddPattern();
								}
							}}
							error={!!errors.urlPatterns}
						/>
						<Button variant="primary" onClick={handleAddPattern}>
							<Plus size={16} />
							{t("common.add")}
						</Button>
					</div>

					<Show when={errors.urlPatterns}>
						<p class="text-error text-sm">{errors.urlPatterns}</p>
					</Show>

					{/* Pattern List */}
					<Show
						when={local.urlPatterns.length > 0}
						fallback={
							<div class="text-center py-4 opacity-50">未添加任何 URL 模式</div>
						}
					>
						<div class="flex flex-col gap-2">
							<For each={local.urlPatterns}>
								{(pattern, index) => (
									<div class="flex items-center gap-2 p-2 bg-base-300 rounded">
										<code class="flex-1 text-sm">{pattern}</code>
										<Button
											size="xs"
											variant="ghost"
											onClick={() => handleRemovePattern(index())}
										>
											<Trash2 size={14} />
										</Button>
									</div>
								)}
							</For>
						</div>
					</Show>

					{/* Pattern Help */}
					<div class="alert alert-info">
						<div class="text-xs">
							<p class="font-bold mb-1">模式示例：</p>
							<ul class="list-disc list-inside space-y-1">
								<li>
									<code>example.com</code> - 精确匹配域名
								</li>
								<li>
									<code>*.example.com</code> - 匹配所有子域名
								</li>
								<li>
									<code>*.github.com</code> - 匹配如 gist.github.com
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			{/* Translation Settings Section */}
			<div class="card bg-base-200">
				<div class="card-body gap-4">
					<h3 class="card-title text-lg">翻译设置</h3>

					{/* Enable Translation */}
					<FormField label="启用翻译" helperText="为此网站启用或禁用翻译">
						<ButtonGroup
							options={[
								{ value: "default", label: "默认" },
								{ value: "true", label: "是" },
								{ value: "false", label: "否" },
							]}
							value={
								local.enableTranslation === undefined
									? "default"
									: local.enableTranslation
										? "true"
										: "false"
							}
							onChange={(value) => {
								if (value === "default") {
									setLocal("enableTranslation", undefined);
								} else if (value === "true") {
									setLocal("enableTranslation", true);
								} else {
									setLocal("enableTranslation", false);
								}
							}}
						/>
					</FormField>
					<FormField label="翻译模式" helperText="选择翻译模式">
						<ButtonGroup
							options={[
								{ value: "default", label: "默认" },
								{ value: "parallel", label: "对照翻译" },
								{ value: "replace", label: "替换翻译" },
							]}
							value={
								local.translateMode === undefined
									? "default"
									: local.translateMode
							}
							onChange={(value) => {
								if (value === "default") {
									setLocal("translateMode", undefined);
								} else {
									setLocal("translateMode", value as "parallel" | "replace");
								}
							}}
						/>
					</FormField>

					{/* Source Language */}
					<FormField label={t("settings.translation.sourceLanguage")}>
						<Select
							value={local.sourceLang || ""}
							onChange={(e) => {
								const value = e.currentTarget.value;
								setLocal("sourceLang", value || undefined);
							}}
							options={sourceLanguageOptions()}
						/>
					</FormField>

					{/* Target Language */}
					<FormField label={t("settings.translation.targetLanguage")}>
						<Select
							value={local.targetLang || ""}
							onChange={(e) => {
								const value = e.currentTarget.value;
								setLocal("targetLang", value || undefined);
							}}
							options={targetLanguageOptions()}
						/>
					</FormField>
				</div>
			</div>

			{/* Advanced Settings Section */}
			<div class="card bg-base-200">
				<div class="card-body gap-4">
					<h3 class="card-title text-lg">高级设置</h3>

					{/* Floating Ball */}
					<FormField
						label={t("settings.basic.floatingBallEnabled")}
						helperText="在此网站显示或隐藏悬浮球"
					>
						<ButtonGroup
							options={[
								{ value: "default", label: "默认" },
								{ value: "true", label: "是" },
								{ value: "false", label: "否" },
							]}
							value={
								local.floatingBallEnabled === undefined
									? "default"
									: local.floatingBallEnabled
										? "true"
										: "false"
							}
							onChange={(value) => {
								if (value === "default") {
									setLocal("floatingBallEnabled", undefined);
								} else if (value === "true") {
									setLocal("floatingBallEnabled", true);
								} else {
									setLocal("floatingBallEnabled", false);
								}
							}}
						/>
					</FormField>

					{/* Translate Full Page */}
					<FormField
						label={t("settings.translation.translateFullPage")}
						helperText={t("settings.translation.translateFullPageDesc")}
					>
						<ButtonGroup
							options={[
								{ value: "default", label: "默认" },
								{ value: "true", label: "是" },
								{ value: "false", label: "否" },
							]}
							value={
								local.translateFullPage === undefined
									? "default"
									: local.translateFullPage
										? "true"
										: "false"
							}
							onChange={(value) => {
								if (value === "default") {
									setLocal("translateFullPage", undefined);
								} else if (value === "true") {
									setLocal("translateFullPage", true);
								} else {
									setLocal("translateFullPage", false);
								}
							}}
						/>
					</FormField>

					{/* Filter Interactive */}
					<FormField
						label={t("settings.translation.filterInteractive")}
						helperText={t("settings.translation.filterInteractiveDesc")}
					>
						<ButtonGroup
							options={[
								{ value: "default", label: "默认" },
								{ value: "true", label: "是" },
								{ value: "false", label: "否" },
							]}
							value={
								local.filterInteractive === undefined
									? "default"
									: local.filterInteractive
										? "true"
										: "false"
							}
							onChange={(value) => {
								if (value === "default") {
									setLocal("filterInteractive", undefined);
								} else if (value === "true") {
									setLocal("filterInteractive", true);
								} else {
									setLocal("filterInteractive", false);
								}
							}}
						/>
					</FormField>
				</div>
			</div>
		</div>
	);
};
