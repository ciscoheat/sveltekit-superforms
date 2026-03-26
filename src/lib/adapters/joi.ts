import {
	type ValidationAdapter,
	type AdapterOptions,
	createAdapter,
	type ValidationResult,
	type ClientValidationAdapter,
	type Infer
} from './adapters.js';
import type { ObjectSchema } from 'joi';
import { memoize } from '$lib/memoize.js';
import convert from './joi-to-json-schema/index.js';

async function validate<T extends ObjectSchema>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Record<string, unknown>>> {
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

/* @__NO_SIDE_EFFECTS__ */
function _joi<T extends ObjectSchema>(
	schema: T,
	options?: AdapterOptions<Infer<T, 'joi'>>
): ValidationAdapter<Record<string, unknown>> {
	return createAdapter({
		superFormValidationLibrary: 'joi',
		jsonSchema: options?.jsonSchema ?? convert(schema),
		defaults: options?.defaults,
		validate: async (data) => validate(schema, data)
	});
}

function _joiClient<T extends ObjectSchema>(
	schema: T
): ClientValidationAdapter<Record<string, unknown>> {
	return {
		superFormValidationLibrary: 'joi',
		validate: async (data) => validate(schema, data)
	};
}

export const joi = /* @__PURE__ */ memoize(_joi);
export const joiClient = /* @__PURE__ */ memoize(_joiClient);
