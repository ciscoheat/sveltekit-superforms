import { type JsonSchemaOptions, type ValidationAdapter, createAdapter } from './adapters.js';
import type { Schema } from 'yup';
import type { Infer } from '$lib/index.js';
import { splitPath } from '$lib/stringPath.js';
import { memoize } from '$lib/memoize.js';

const fetchModule = /* @__PURE__ */ memoize(async () => {
	const { ValidationError } = await import(/* webpackIgnore: true */ 'yup');
	const { convertSchema } = await import(/* webpackIgnore: true */ '@sodaru/yup-to-json-schema');
	return { ValidationError, convertSchema };
});

const { ValidationError, convertSchema } = await fetchModule();

/* @__NO_SIDE_EFFECTS__ */
export const yupToJsonSchema = (...params: Parameters<typeof convertSchema>) => {
	return convertSchema(...params);
};

/* @__NO_SIDE_EFFECTS__ */
function _yup<T extends Schema>(
	schema: T,
	options?: JsonSchemaOptions<Infer<T>>
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'yup',
		async validate(data: unknown) {
			try {
				return {
					success: true,
					data: await schema.validate(data, { strict: true, abortEarly: false })
				};
			} catch (error) {
				if (!(error instanceof ValidationError)) throw error;

				return {
					success: false,
					issues: error.inner.map((error) => ({
						message: error.message,
						path:
							error.path !== null && error.path !== undefined ? splitPath(error.path) : undefined
					}))
				};
			}
		},
		jsonSchema: options?.jsonSchema ?? yupToJsonSchema(schema),
		defaults: options?.defaults
	});
}

export const yup = /* @__PURE__ */ memoize(_yup);
