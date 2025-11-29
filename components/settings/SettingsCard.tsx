import { type Component, type JSX, Show } from "solid-js";
import { Card } from "~/components/Card";
import { cn } from "~/utils/cn";

export interface SettingsCardProps {
	title: string;
	navId: string;
	children: JSX.Element;
	class?: string;
	actions?: JSX.Element;
}

export const SettingsCard: Component<SettingsCardProps> = (props) => {
	return (
		<Card.Root
			class={cn("rounded-2xl border border-base-300 bg-base-100", props.class)}
			data-nav={props.navId}
		>
			<Card.Body class="space-y-6 p-6">
				<Card.Title class="flex flex-wrap items-center gap-3 text-lg font-semibold">
					<span class="border-l-4 border-primary pl-3">{props.title}</span>
					<Show when={props.actions}>
						<div class="ml-auto flex items-center gap-2 text-sm">
							{props.actions}
						</div>
					</Show>
				</Card.Title>
				<div class="space-y-6">{props.children}</div>
			</Card.Body>
		</Card.Root>
	);
};
