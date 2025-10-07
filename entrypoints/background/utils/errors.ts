import { LLMError } from "#imports";

export enum TranslateErrorType {
	MODEL_NOT_FOUND = "MODEL_NOT_FOUND",
	VALIDATION_ERROR = "VALIDATION_ERROR",
	NETWORK_ERROR = "NETWORK_ERROR",
	API_ERROR = "API_ERROR",
	CACHE_ERROR = "CACHE_ERROR",
	UNSUPPORTED_OPERATION = "UNSUPPORTED_OPERATION",
	SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
	QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
	INVALID_LANGUAGE = "INVALID_LANGUAGE",
	CONTENT_TOO_LONG = "CONTENT_TOO_LONG",
}

export interface TranslateError {
	type: TranslateErrorType;
	message: string;
	code?: string;
	details?: Record<string, unknown>;
}

export const createTranslateError = (
	type: TranslateErrorType,
	message: string,
	code?: string,
	details?: Record<string, unknown>,
): TranslateError => ({
	type,
	message,
	code,
	details,
});

// Helper function to extract meaningful error message from any error object
const extractMeaningfulMessage = (error: unknown, fallback: string): string => {
	if (!error) return fallback;

	// If it's a string, return it directly
	if (typeof error === "string") return error;

	// If it's an Error object, get its message
	if (error instanceof Error) return error.message;

	// If it's an object, try to find a meaningful message
	if (typeof error === "object") {
		const errorObj = error as Record<string, unknown>;

		// Check common message fields recursively
		const messageFields = ["message", "error", "details", "description"];
		for (const field of messageFields) {
			if (
				typeof errorObj[field] === "string" &&
				(errorObj[field] as string).trim()
			) {
				return errorObj[field] as string;
			}
			// Recursively check nested objects
			if (errorObj[field] && typeof errorObj[field] === "object") {
				const nested = extractMeaningfulMessage(errorObj[field], "");
				if (nested) return nested;
			}
		}

		// Check for originalError
		if (errorObj.originalError) {
			const nested = extractMeaningfulMessage(errorObj.originalError, "");
			if (nested) return nested;
		}
	}

	return fallback;
};

// Helper function to extract error code from any error object
const extractErrorCode = (error: unknown): string | undefined => {
	if (!error || typeof error !== "object") return undefined;

	const errorObj = error as Record<string, unknown>;

	// Check common code fields
	const codeFields = ["code", "statusCode", "status", "errorCode"];
	for (const field of codeFields) {
		if (
			typeof errorObj[field] === "string" ||
			typeof errorObj[field] === "number"
		) {
			return String(errorObj[field]);
		}
	}

	// Recursively check nested objects
	for (const field of ["error", "details", "originalError"]) {
		if (errorObj[field] && typeof errorObj[field] === "object") {
			const nested = extractErrorCode(errorObj[field]);
			if (nested) return nested;
		}
	}

	return undefined;
};

export const isTranslateError = (error: unknown): error is TranslateError => {
	return (
		typeof error === "object" &&
		error !== null &&
		"type" in error &&
		"message" in error &&
		Object.values(TranslateErrorType).includes((error as TranslateError).type)
	);
};

// Type guards for external error types
const isLLMError = (error: unknown): error is LLMError => {
	return error instanceof LLMError;
};

const isTranslationError = (
	error: unknown,
): error is import("~/utils/translate").TranslationError => {
	return (
		typeof error === "object" &&
		error !== null &&
		"type" in error &&
		"message" in error &&
		"service" in error
	);
};

// Convert LLM errors to TranslateError
export const convertFromLLMError = (error: unknown): TranslateError => {
	if (!isLLMError(error)) {
		const message = extractMeaningfulMessage(error, "Unknown LLM error");
		const code = extractErrorCode(error);
		return createTranslateError(TranslateErrorType.API_ERROR, message, code);
	}

	let errorType = TranslateErrorType.API_ERROR;

	switch (error.type) {
		case "authentication_error":
		case "api_error":
			errorType = TranslateErrorType.API_ERROR;
			break;
		case "rate_limit_error":
			errorType = TranslateErrorType.QUOTA_EXCEEDED;
			break;
		case "network_error":
			errorType = TranslateErrorType.NETWORK_ERROR;
			break;
		case "validation_error":
			errorType = TranslateErrorType.VALIDATION_ERROR;
			break;
		default:
			errorType = TranslateErrorType.API_ERROR;
	}

	// Extract the most meaningful message and code
	const message = extractMeaningfulMessage(
		error.originalError,
		error.message || "Unknown LLM error",
	);
	const code = extractErrorCode(error.originalError) || error.code;

	return createTranslateError(errorType, message, code);
};

// Convert TranslationError to TranslateError
export const convertFromTranslationError = (error: unknown): TranslateError => {
	if (!isTranslationError(error)) {
		const message = extractMeaningfulMessage(
			error,
			"Unknown translation error",
		);
		const code = extractErrorCode(error);
		return createTranslateError(TranslateErrorType.API_ERROR, message, code);
	}

	let errorType = TranslateErrorType.API_ERROR;

	switch (error.type) {
		case "AUTHENTICATION_ERROR":
		case "API_ERROR":
			errorType = TranslateErrorType.API_ERROR;
			break;
		case "RATE_LIMIT_ERROR":
			errorType = TranslateErrorType.QUOTA_EXCEEDED;
			break;
		case "NETWORK_ERROR":
			errorType = TranslateErrorType.NETWORK_ERROR;
			break;
		default:
			errorType = TranslateErrorType.API_ERROR;
	}

	// Extract the most meaningful message and code
	const message = extractMeaningfulMessage(
		error.details,
		error.message || "Unknown translation error",
	);
	const code = extractErrorCode(error.details) || error.statusCode?.toString();

	return createTranslateError(
		errorType,
		message,
		code,
		{ service: error.service }, // Keep service info but remove nested originalError
	);
};

// Convert generic errors to TranslateError
export const convertGenericError = (error: unknown): TranslateError => {
	const message = extractMeaningfulMessage(error, "Unknown error");
	const code = extractErrorCode(error);

	return createTranslateError(TranslateErrorType.API_ERROR, message, code);
};
