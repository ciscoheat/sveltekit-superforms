import {
	type ValidationAdapter,
	createAdapter,
	type ValidationResult,
	type ClientValidationAdapter,
	createJsonSchema,
	type RequiredDefaultsOptions,
	type Infer
} from './adapters.js';
import type { Struct } from 'superstruct/dist/struct.js';
import { memoize } from '$lib/memoize.js';

async function validate<T extends Struct>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
	const result = schema.validate(data, { coerce: true });
	if (result[0] == null) {
		return {
			data: result[1],
			success: true
		};
	}
	const { message, path } = result[0];
	return {
		issues: [{ message, path }],
		success: false
	};
}

function _superstruct<T extends Struct>(
	schema: T,
	options: RequiredDefaultsOptions<T>
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'superstruct',
		validate: async (data) => validate(schema, data),
		jsonSchema: createJsonSchema(options),
		defaults: options.defaults
	});
}

function _superstructClient<T extends Struct>(schema: T): ClientValidationAdapter<Infer<T>> {
	return {
		superFormValidationLibrary: 'superstruct',
		validate: async (data) => validate(schema, data)
	};
}

export const superstruct = /* @__PURE__ */ memoize(_superstruct);
export const superstructClient = /* @__PURE__ */ memoize(_superstructClient);
