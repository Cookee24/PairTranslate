let _isAndroid: boolean | undefined;

export const isAndroid = (): boolean => {
	_isAndroid ??= /Android/.test(navigator.userAgent);
	return _isAndroid;
};
