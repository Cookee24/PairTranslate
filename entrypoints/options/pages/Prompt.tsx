import { useNavigate } from "@solidjs/router";
import { ArrowLeft } from "lucide-solid";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { SettingsRecoveryBanner } from "~/components/SettingsRecoveryBanner";
import { t } from "~/utils/i18n";

const PromptPage = () => {
	const navigate = useNavigate();

	return (
		<div class="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
			<div class="flex items-center">
				<Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
					<ArrowLeft size={16} />
					{t("settings.prompt.backToSettings")}
				</Button>
			</div>
			<SettingsRecoveryBanner />
			<Card.Root dash class="rounded-box">
				<Card.Body class="space-y-4">
					<Card.Title>{t("settings.prompt.pageTitle")}</Card.Title>
					<p class="text-base-content/70">
						{t("settings.prompt.placeholderDescription")}
					</p>
					<div class="alert">
						<span>{t("common.featureInDevelopment")}</span>
					</div>
				</Card.Body>
			</Card.Root>
		</div>
	);
};

export default PromptPage;
