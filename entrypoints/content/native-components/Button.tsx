import type { JSX } from "solid-js";

export const NativeButton = (props: JSX.HTMLAttributes<HTMLButtonElement>) => {
	return (
		<button
			style={{
				appearance: "none",
				border: "none",
				background: "none",
				padding: "0",
				margin: "0",
				font: "inherit",
				color: "inherit",
				cursor: "pointer",
				outline: "none",
				"text-decoration": "none",
				"box-sizing": "border-box",
			}}
			{...props}
		></button>
	);
};
