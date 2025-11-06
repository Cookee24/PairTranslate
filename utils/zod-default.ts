import z from "zod";

type WithDefault<T extends z.ZodTypeAny> = T extends z.ZodDefault<infer U>
	? U
	: never;

type PickDefaults<T extends z.ZodObject> = {
	[K in keyof T["shape"] as T["shape"][K] extends z.ZodDefault
		? K
		: never]: z.infer<WithDefault<T["shape"][K]>>;
};

export const getDefault = <Schema extends z.ZodObject>(
	schema: Schema,
): PickDefaults<Schema> => {
	return Object.fromEntries(
		Object.entries(schema.shape)
			.filter(([, value]) => value instanceof z.ZodDefault)
			.map(([key, value]) => [key, value.def.defaultValue()]),
	) as PickDefaults<Schema>;
};
