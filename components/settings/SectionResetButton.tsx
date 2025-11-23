import { createSignal } from "solid-js";
import { Button } from "~/components/Button";
import { t } from "~/utils/i18n";

interface SectionResetButtonProps {
	onReset: () => void | Promise<void>;
	confirmMessage?: string;
}

export const SectionResetButton = (props: SectionResetButtonProps) => {
	const [loading, setLoading] = createSignal(false);

	const handleReset = async () => {
		if (loading()) return;
		if (!confirm(props.confirmMessage ?? t("settings.sectionResetConfirm"))) {
			return;
		}

		try {
			setLoading(true);
			await props.onReset();
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button variant="ghost" size="sm" onClick={handleReset} loading={loading()}>
			{t("common.resetSection")}
		</Button>
	);
};
