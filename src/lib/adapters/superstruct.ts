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

// async function modules() {
// 	const { validate } = await import(/* webpackIgnore: true */ 'superstruct');
// 	return { validate };
// }

// const fetchModule = /* @__PURE__ */ memoize(modules);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validate<T extends Struct<any, any>>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
	const result = schema.validate(data, { coerce: true });
	if (!result[0]) {
		return {
			data: result[1] as Infer<T>,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _superstruct<T extends Struct<any, any>>(
	schema: T,
	options: RequiredDefaultsOptions<Infer<T>>
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'superstruct',
		defaults: options.defaults,
		jsonSchema: createJsonSchema(options),
		validate: async (data) => validate(schema, data)
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
