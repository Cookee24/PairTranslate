import type { Component, JSX } from "solid-js";

export interface SettingsCardProps {
	title: string;
	navId: string;
	children: JSX.Element;
	class?: string;
}

export const SettingsCard: Component<SettingsCardProps> = (props) => {
	return (
		<Card.Root class="bg-base-200 rounded-xl shadow-sm" data-nav={props.navId}>
			<Card.Body>
				<Card.Title>{props.title}</Card.Title>
				{props.children}
			</Card.Body>
		</Card.Root>
	);
};
