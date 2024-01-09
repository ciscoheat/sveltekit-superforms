import {
	type ValidationAdapter,
	type BaseValidationAdapter,
	adapter,
	type JsonSchemaOptions,
	mapAdapter
} from './index.js';
import type { Inferred } from '$lib/index.js';
import type { ObjectSchema } from 'joi';
import joiToJson from 'joi-to-json';

function _joi<T extends ObjectSchema>(
	schema: T,
	options?: JsonSchemaOptions<T>
): ValidationAdapter<Record<string, unknown>> {
	const adapter = {
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
	} satisfies BaseValidationAdapter<Inferred<T>>;

	return mapAdapter(adapter);
}

export const joi = adapter(_joi);
