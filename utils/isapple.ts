let _isApple: boolean | undefined;

export const isApple = (): boolean => {
	_isApple ??= /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
	return _isApple;
};
