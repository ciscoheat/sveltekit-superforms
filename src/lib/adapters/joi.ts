import { type ValidationAdapter, type JsonSchemaOptions, createAdapter } from './adapters.js';
import type { ObjectSchema } from 'joi';
import { memoize } from '$lib/memoize.js';
import convert from './joi-to-json-schema/index.js';

/* @__NO_SIDE_EFFECTS__ */
function _joi<T extends ObjectSchema>(
	schema: T,
	options?: JsonSchemaOptions<T>
): ValidationAdapter<Record<string, unknown>> {
	return createAdapter({
		superFormValidationLibrary: 'joi',
		jsonSchema: options?.jsonSchema ?? convert(schema),
		defaults: options?.defaults,
		async validate(data) {
			const result = schema.validate(data, { abortEarly: false });
			if (result.error == null) {
				return {
					data: result.value,
					success: true
				};
			}
			return {
				issues: result.error.details.map(({ message, path }) => ({
					message,
					path
				})),
				success: false
			};
		}
	});
}

export const joi = /* @__PURE__ */ memoize(_joi);
