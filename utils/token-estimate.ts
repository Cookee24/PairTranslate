export type TokenEstimatePayload = string | string[];

const sumTokens = (
	payload: TokenEstimatePayload,
	estimator: (text: string) => number,
): number => {
	if (Array.isArray(payload)) {
		return payload.reduce(
			(total, part) => total + sumTokens(part, estimator),
			0,
		);
	}
	return estimator(payload);
};

export const estimateTokens = (payload: TokenEstimatePayload): number =>
	sumTokens(payload, (text) => {
		// Simple estimation: 1 token per 4 characters
		return Math.max(1, Math.ceil(text.length / 4));
	});
