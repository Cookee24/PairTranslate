import { type Component, type JSX, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const progressVariants = tv({
	base: "progress",
	variants: {
		variant: {
			primary: "progress-primary",
			secondary: "progress-secondary",
			accent: "progress-accent",
			info: "progress-info",
			success: "progress-success",
			warning: "progress-warning",
			error: "progress-error",
			neutral: "progress-neutral",
		},
	},
});

const circularProgressVariants = tv({
	base: "radial-progress",
	variants: {
		variant: {
			primary: "text-primary",
			secondary: "text-secondary",
			accent: "text-accent",
			info: "text-info",
			success: "text-success",
			warning: "text-warning",
			error: "text-error",
			neutral: "text-neutral",
		},
	},
});

type BaseProgressProps = {
	value?: number;
	max?: number;
	showValue?: boolean;
};

export type ProgressProps =
	| (BaseProgressProps &
			VariantProps<typeof progressVariants> & {
				type?: "linear";
			} & JSX.HTMLAttributes<HTMLProgressElement>)
	| (BaseProgressProps &
			VariantProps<typeof circularProgressVariants> & {
				type: "circular";
			} & JSX.HTMLAttributes<HTMLDivElement>);

export const Progress: Component<ProgressProps> = (props) => {
	const progressValue = () => props.value ?? undefined;
	const progressMax = () => props.max ?? 100;
	const percentage = () => {
		const value = props.value ?? 0;
		const max = props.max ?? 100;
		return Math.min((value / max) * 100, 100);
	};

	if (props.type === "circular") {
		const [local, divProps] = splitProps(props, [
			"value",
			"max",
			"variant",
			"type",
			"showValue",
			"class",
			"style",
		]);

		return (
			<div
				{...divProps}
				class={cn(
					circularProgressVariants({ variant: local.variant }),
					local.class,
				)}
				style={{
					"--value": percentage(),
					...(typeof local.style === "object" && local.style !== null
						? local.style
						: {}),
				}}
				role="progressbar"
				aria-valuenow={progressValue()}
				aria-valuemin={0}
				aria-valuemax={progressMax()}
			>
				{local.showValue && `${Math.round(percentage())}%`}
			</div>
		);
	}

	const [local, progressProps] = splitProps(props, [
		"value",
		"max",
		"variant",
		"type",
		"showValue",
		"class",
	]);

	return (
		<progress
			{...progressProps}
			class={cn(progressVariants({ variant: local.variant }), local.class)}
			value={progressValue()}
			max={progressMax()}
		/>
	);
};
