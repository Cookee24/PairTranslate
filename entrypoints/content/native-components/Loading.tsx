export const NativeLoading = () => {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16">
			<g>
				<animateTransform
					attributeName="transform"
					type="rotate"
					from="0 8 8"
					to="360 8 8"
					dur="1s"
					repeatCount="indefinite"
				/>
				<circle
					cx="8"
					cy="8"
					r="6"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-dasharray="18.84"
					stroke-dashoffset="14.13"
					opacity="0.8"
				/>
			</g>
		</svg>
	);
};
