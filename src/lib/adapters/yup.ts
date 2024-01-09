import { convertSchema } from '@sodaru/yup-to-json-schema';
import { adapter, type JsonSchemaOptions, type ValidationAdapter, createAdapter } from './index.js';
import { Schema, ValidationError } from 'yup';
import type { Inferred } from '$lib/index.js';
import { splitPath } from '$lib/stringPath.js';

export const yupToJsonSchema = (...params: Parameters<typeof convertSchema>) => {
	return convertSchema(...params);
};

function _yup<T extends Schema>(
	schema: T,
	options?: JsonSchemaOptions<Inferred<T>>
): ValidationAdapter<Inferred<T>> {
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

export const yup = adapter(_yup);
