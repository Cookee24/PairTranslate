import { ExternalLink, Github } from "lucide-solid";
import { type Accessor, Show } from "solid-js";
import { browser } from "#imports";
import { Button } from "~/components/Button";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { t } from "~/utils/i18n";

interface AboutProps {
	navId: string;
	onRevealDebug?: () => void;
	debugVisible?: Accessor<boolean>;
	debugTapsRemaining?: Accessor<number>;
}

const APP_ICON_URL = browser.runtime.getURL("/icons/128.png");

export default (props: AboutProps) => {
	const extensionName = t("settings.about.extensionName");
	const debugVisible = () => props.debugVisible?.() ?? false;

	return (
		<SettingsCard navId={props.navId} title={t("settings.about.title")}>
			<div class="space-y-6">
				<div class="text-center">
					<Button
						type="button"
						variant="ghost"
						onClick={() => props.onRevealDebug?.()}
						class="btn-circle mx-auto mb-4 h-20 w-20 border border-base-300/60 bg-base-50 shadow"
						aria-label={t("settings.about.debugIconLabel")}
					>
						<img src={APP_ICON_URL} alt={t("settings.about.debugIconLabel")} />
					</Button>
					<Show when={debugVisible()}>
						<p class="text-xs font-semibold text-success">
							{t("settings.about.debugUnlocked")}
						</p>
					</Show>
					<h2 class="mb-2 text-2xl font-bold">{extensionName}</h2>
					<p class="text-base-content/70">
						{t("settings.about.version")}{" "}
						{
							// @ts-ignore
							__APP_VERSION__
						}
					</p>
				</div>

				<div>
					<h3 class="mb-3 text-lg font-semibold">
						{t("settings.about.description")}
					</h3>
					<p class="leading-relaxed text-base-content/80">
						{t("meta.description")}
					</p>
				</div>

				<div>
					<h3 class="mb-3 text-lg font-semibold">
						{t("settings.about.features")}
					</h3>
					<ul class="space-y-2 text-base-content/80">
						<li>→ {t("settings.about.featuresList._1")}</li>
						<li>→ {t("settings.about.featuresList._2")}</li>
						<li>→ {t("settings.about.featuresList._3")}</li>
						<li>→ {t("settings.about.featuresList._4")}</li>
						<li>→ {t("settings.about.featuresList._5")}</li>
						<li>→ {t("settings.about.featuresList._6")}</li>
					</ul>
				</div>

				<div>
					<h3 class="mb-3 text-lg font-semibold">
						{t("settings.about.links")}
					</h3>
					<div class="space-y-2">
						<a
							href="https://github.com/Cookee24/PairTranslate"
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-primary hover:underline"
						>
							<Github size={16} />
							{t("settings.about.sourceCode")}
							<ExternalLink size={14} />
						</a>
						<a
							href="https://github.com/Cookee24/PairTranslate/issues/new/choose"
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-primary hover:underline"
						>
							<ExternalLink size={16} />
							{t("settings.about.reportIssues")}
							<ExternalLink size={14} />
						</a>
					</div>
				</div>

				<div>
					<h3 class="mb-3 text-lg font-semibold">
						{t("settings.about.thirdParty")}
					</h3>
					<p class="mb-2 text-sm text-base-content/70">
						{t("settings.about.thirdPartyDesc")}
					</p>
					<ul class="space-y-1 text-sm text-base-content/70">
						<li>→ {t("settings.about.thirdPartyList._1")}</li>
						<li>→ {t("settings.about.thirdPartyList._2")}</li>
						<li>→ {t("settings.about.thirdPartyList._3")}</li>
						<li>→ {t("settings.about.thirdPartyList._4")}</li>
						<li>→ {t("settings.about.thirdPartyList._5")}</li>
						<li>→ {t("settings.about.thirdPartyList._6")}</li>
					</ul>
					<p class="mt-2 text-sm text-base-content/70">
						{t("settings.about.thirdPartyNote")}
					</p>
				</div>

				<div class="border-t border-base-300 pt-4 text-center">
					<p class="text-sm text-base-content/60">
						{t("settings.about.footer")}
					</p>
				</div>
			</div>
		</SettingsCard>
	);
};
