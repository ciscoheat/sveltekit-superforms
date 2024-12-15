import {
	type ValidationAdapter,
	createAdapter,
	type ClientValidationAdapter,
	createJsonSchema,
	type RequiredDefaultsOptions,
	type Infer,
	type ValidationResult
} from './adapters.js';
import type { Struct } from 'superstruct';
import { memoize } from '$lib/memoize.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StructObject<T extends Record<string, unknown>> = Struct<T, any>;

async function validate<T extends StructObject<Infer<T, 'superstruct'>>>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T, 'superstruct'>>> {
	const result = schema.validate(data, { coerce: true });
	if (!result[0]) {
		return {
			data: result[1] as Infer<T, 'superstruct'>,
			success: true
		};
	}
	const errors = result[0];
	return {
		success: false,
		issues: errors.failures().map((error) => ({
			message: error.message,
			path: error.path
		}))
	};
}

function _superstruct<T extends StructObject<Infer<T, 'superstruct'>>>(
	schema: T,
	options: RequiredDefaultsOptions<Infer<T, 'superstruct'>>
): ValidationAdapter<Infer<T, 'superstruct'>> {
	return createAdapter({
		superFormValidationLibrary: 'superstruct',
		defaults: options.defaults,
		jsonSchema: createJsonSchema(options),
		validate: async (data) => validate(schema, data)
	});
}

function _superstructClient<T extends StructObject<Infer<T, 'superstruct'>>>(
	schema: T
): ClientValidationAdapter<Infer<T, 'superstruct'>> {
	return {
		superFormValidationLibrary: 'superstruct',
		validate: async (data) => validate(schema, data)
	};
}

export const superstruct = /* @__PURE__ */ memoize(_superstruct);
export const superstructClient = /* @__PURE__ */ memoize(_superstructClient);
