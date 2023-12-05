import Ajv from 'ajv';
import type { JSONSchema } from '$lib/jsonSchema.js';
import addFormats from 'ajv-formats';

import type { ValidationAdapter } from './index.js';

export function ajv<T extends Record<string, unknown>>(
	schema: JSONSchema,
	options?: Ajv.Options
): ValidationAdapter<T> {
	options = { allErrors: true, ...(options || {}) };
	const ajv = new Ajv.default(options);
	// @ts-expect-error No type info exists
	addFormats(ajv);
	const validator = ajv.compile(schema);

	return {
		superFormValidationLibrary: 'ajv',
		validator() {
			return validator;
		},
		jsonSchema() {
			return schema;
		},
		cacheKeys: [schema, options],
		async customValidator(data: unknown) {
			if (validator(data)) {
				return {
					data: data as T,
					success: true
				};
			}
			return {
				issues: (validator.errors ?? []).map(
					({ message, instancePath }: { message?: string; instancePath?: string }) => ({
						message: message ?? '',
						path: (instancePath ?? '/').slice(1).split('/')
					})
				),
				success: false
			};
		}
	};
}
