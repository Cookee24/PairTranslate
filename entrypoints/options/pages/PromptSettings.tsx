import { useNavigate } from "@solidjs/router";
import { Button } from "~/components/Button";
import { SectionResetButton } from "~/components/settings/SectionResetButton";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import { generatePromptSettings } from "~/utils/settings";

const PromptSettings = (props: { navId: string }) => {
	const navigate = useNavigate();
	const { setSettings } = useSettings();

	const handleReset = () =>
		setSettings("prompts", () => generatePromptSettings());

	return (
		<SettingsCard
			title={t("settings.prompt.title")}
			navId={props.navId}
			actions={<SectionResetButton onReset={handleReset} />}
		>
			<div class="flex justify-center">
				<Button variant="primary" onClick={() => navigate("/prompt")}>
					{t("settings.prompt.openManager")}
				</Button>
			</div>
		</SettingsCard>
	);
};

export default PromptSettings;
