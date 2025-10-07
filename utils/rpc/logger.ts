export interface Logger {
	debug(...args: Parameters<typeof console.debug>[1]): void;
	info(...args: Parameters<typeof console.info>[1]): void;
	warn(...args: Parameters<typeof console.warn>[1]): void;
	error(...args: Parameters<typeof console.error>[1]): void;
}

export function createLogger(
	level: "debug" | "info" | "warn" | "error" = "info",
	prefix = "RPC",
): Logger {
	const baseStyle = `border-radius: 2px; background: #f4f4f4; color: #333; padding: 1px 3px; font-size: 12px; font-weight: bold;`;
	const styles = {
		debug: `${baseStyle} background: #007acc;`,
		info: `${baseStyle} background: #28a745;`,
		warn: `${baseStyle} background: #ffc107;`,
		error: `${baseStyle} background: #dc3545;`,
	};

	return {
		debug: (...args) => {
			if (level === "debug") {
				console.log(`%c${prefix} %cDEBUG`, baseStyle, styles.debug, ...args);
			}
		},
		info: (...args) => {
			if (level === "info" || level === "debug") {
				console.log(`%c${prefix} %cINFO`, baseStyle, styles.info, ...args);
			}
		},
		warn: (...args) => {
			if (level === "warn" || level === "info" || level === "debug") {
				console.log(`%c${prefix} %cWARN`, baseStyle, styles.warn, ...args);
			}
		},
		error: (...args) => {
			if (
				level === "error" ||
				level === "warn" ||
				level === "info" ||
				level === "debug"
			) {
				console.log(`%c${prefix} %cERROR`, baseStyle, styles.error, ...args);
			}
		},
	};
}
