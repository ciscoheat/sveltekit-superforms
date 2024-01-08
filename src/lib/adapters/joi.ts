import { type ValidationAdapter, adapter, type JsonSchemaOptions } from './index.js';
import type { Inferred } from '$lib/index.js';
import type { ObjectSchema } from 'joi';
import joiToJson from 'joi-to-json';

function _joi<T extends ObjectSchema>(
	schema: T,
	options?: JsonSchemaOptions<T>
): ValidationAdapter<Inferred<T>> {
	return {
		superFormValidationLibrary: 'joi',
		// @ts-expect-error No type information exists for joi-to-json
		jsonSchema: options?.jsonSchema ?? joiToJson(schema),
		defaults: options?.defaults,
		async process(data) {
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
	};
}

export const joi = adapter(_joi);
