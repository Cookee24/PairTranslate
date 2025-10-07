import { createSignal } from "solid-js";
import type { z } from "zod";

export function useForm<
	T extends Record<string, string | number | boolean | undefined>,
>(schema: z.ZodType<T>, initialData: T, onSave: (data: T) => void) {
	const [formData, setFormData] = createSignal<T>(initialData);
	const [validationErrors, setValidationErrors] =
		createSignal<z.ZodError | null>(null);

	const handleSave = () => {
		const result = schema.safeParse(formData());
		if (result.success) {
			onSave(result.data);
			setValidationErrors(null);
			return true;
		}
		setValidationErrors(result.error);
		return false;
	};

	const getFieldError = (fieldPath: string[]) => {
		if (!validationErrors()) return null;
		const issue = validationErrors()?.issues.find(
			(issue) =>
				issue.path.length === fieldPath.length &&
				issue.path.every((segment, index) => segment === fieldPath[index]),
		);
		return issue ? { message: issue.message } : null;
	};

	return {
		formData,
		setFormData,
		handleSave,
		getFieldError,
		validationErrors,
	};
}
