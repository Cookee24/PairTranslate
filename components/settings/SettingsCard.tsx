import { type Component, type JSX, Show } from "solid-js";
import { Card } from "~/components/Card";

export interface SettingsCardProps {
	title: string;
	navId: string;
	children: JSX.Element;
	class?: string;
	actions?: JSX.Element;
}

export const SettingsCard: Component<SettingsCardProps> = (props) => {
	return (
		<Card.Root class="rounded-box bg-base-200/30" data-nav={props.navId}>
			<Card.Body>
				<Card.Title class="flex flex-wrap items-center gap-3 text-lg font-semibold">
					<span>{props.title}</span>
					<Show when={props.actions}>
						<div class="ml-auto flex items-center gap-2 text-sm">
							{props.actions}
						</div>
					</Show>
				</Card.Title>
				{props.children}
			</Card.Body>
		</Card.Root>
	);
};
