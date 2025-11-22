import { mergeRefs } from "@solid-primitives/refs";
import {
	type Component,
	For,
	type JSX,
	onMount,
	Show,
	splitProps,
} from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { animatedHover } from "~/hooks/animation";
import { cn } from "~/utils/cn";

const avatarVariants = tv({
	base: "avatar",
	variants: {
		status: {
			online: "online",
			offline: "offline",
			away: "away",
			busy: "busy",
		},
	},
});

const innerDivVariants = tv({
	variants: {
		size: {
			xs: "w-6",
			sm: "w-8",
			md: "w-10",
			lg: "w-12",
			xl: "w-16",
		},
		shape: {
			circle: "rounded-full",
			square: "rounded-field",
		},
		variant: {
			default: "",
			ringed: "ring ring-primary ring-offset-base-100 ring-offset-2",
			bordered: "border-2 border-primary",
		},
	},
	defaultVariants: {
		size: "md",
		shape: "circle",
		variant: "default",
	},
});

export interface AvatarProps
	extends JSX.ImgHTMLAttributes<HTMLImageElement>,
		VariantProps<typeof avatarVariants>,
		VariantProps<typeof innerDivVariants> {
	src?: string;
	alt?: string;
	fallback?: string;
	name?: string;
	group?: boolean;
	maxVisible?: number;
	avatars?: AvatarProps[];
}

export const Avatar: Component<AvatarProps> = (props) => {
	const [local, rest] = splitProps(props, [
		"size",
		"shape",
		"variant",
		"src",
		"alt",
		"fallback",
		"name",
		"status",
		"group",
		"maxVisible",
		"avatars",
		"class",
		"ref",
	]);

	let imageRef: HTMLImageElement | undefined;

	onMount(() => {
		animatedHover(
			() => imageRef,
			() => true,
		);
	});

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase())
			.slice(0, 2)
			.join("");
	};

	if (local.group) {
		const visibleAvatars = local.avatars?.slice(0, local.maxVisible || 3);
		const remainingCount =
			(local.avatars?.length || 0) - (local.maxVisible || 3);

		return (
			<div class="avatar-group -space-x-6 rtl:space-x-reverse">
				<For each={visibleAvatars}>
					{(avatarProps) => <Avatar {...avatarProps} />}
				</For>
				<Show when={remainingCount > 0}>
					<div class="avatar placeholder">
						<div class="w-12 bg-neutral text-neutral-content">
							<span>+{remainingCount}</span>
						</div>
					</div>
				</Show>
			</div>
		);
	}

	return (
		<div class={cn(avatarVariants({ status: local.status }), local.class)}>
			<div
				class={cn(
					innerDivVariants({
						size: local.size,
						shape: local.shape,
						variant: local.variant,
					}),
				)}
			>
				<Show
					when={local.src}
					fallback={
						<div class="flex h-full w-full items-center justify-center bg-neutral text-neutral-content">
							<span>{local.fallback || getInitials(local.name || "")}</span>
						</div>
					}
				>
					<img
						{...rest}
						src={local.src}
						alt={local.alt}
						ref={mergeRefs((el) => {
							imageRef = el;
						}, local.ref)}
					/>
				</Show>
			</div>
		</div>
	);
};
