import { ExternalLink, Github, Info } from "lucide-solid";

export default (props: { navId: string }) => {
	const extensionName = t("settings.about.extensionName");

	return (
		<Card.Root class="bg-base-200 rounded-xl shadow-sm" data-nav={props.navId}>
			<Card.Body>
				<Card.Title>{t("settings.about.title")}</Card.Title>
				<div class="space-y-6">
					<div class="text-center">
						<Info size={48} class="mx-auto mb-4 text-primary" />
						<h2 class="text-2xl font-bold mb-2">{extensionName}</h2>
						<p class="text-base-content/70">
							{t("settings.about.version")}{" "}
							{
								// @ts-ignore
								__APP_VERSION__
							}
						</p>
					</div>

					<div>
						<h3 class="font-semibold text-lg mb-3">
							{t("settings.about.description")}
						</h3>
						<p class="text-base-content/80 leading-relaxed">
							{t("meta.description")}
						</p>
					</div>

					<div>
						<h3 class="font-semibold text-lg mb-3">
							{t("settings.about.features")}
						</h3>
						<ul class="space-y-2 text-base-content/80">
							<li>• {t("settings.about.featuresList._1")}</li>
							<li>• {t("settings.about.featuresList._2")}</li>
							<li>• {t("settings.about.featuresList._3")}</li>
							<li>• {t("settings.about.featuresList._4")}</li>
							<li>• {t("settings.about.featuresList._5")}</li>
							<li>• {t("settings.about.featuresList._6")}</li>
						</ul>
					</div>

					<div>
						<h3 class="font-semibold text-lg mb-3">
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
						<h3 class="font-semibold text-lg mb-3">
							{t("settings.about.thirdParty")}
						</h3>
						<p class="text-sm text-base-content/70 mb-2">
							{t("settings.about.thirdPartyDesc")}
						</p>
						<ul class="text-sm text-base-content/70 space-y-1">
							<li>• {t("settings.about.thirdPartyList._1")}</li>
							<li>• {t("settings.about.thirdPartyList._2")}</li>
							<li>• {t("settings.about.thirdPartyList._3")}</li>
							<li>• {t("settings.about.thirdPartyList._4")}</li>
							<li>• {t("settings.about.thirdPartyList._5")}</li>
							<li>• {t("settings.about.thirdPartyList._6")}</li>
						</ul>
						<p class="text-sm text-base-content/70 mt-2">
							{t("settings.about.thirdPartyNote")}
						</p>
					</div>

					<div class="text-center pt-4 border-t border-base-300">
						<p class="text-sm text-base-content/60">
							{t("settings.about.footer")}
						</p>
					</div>
				</div>
			</Card.Body>
		</Card.Root>
	);
};
