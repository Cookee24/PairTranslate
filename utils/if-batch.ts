export const ifBatchRequestSupported = (apiSpec?: string) => {
	return !["deeplx"].some((x) => apiSpec === x);
};
