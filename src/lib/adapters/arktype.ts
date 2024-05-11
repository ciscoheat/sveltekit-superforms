import { type, type Type } from 'arktype';
import {
	type ValidationAdapter,
	type RequiredDefaultsOptions,
	type Infer,
	type InferIn,
	createAdapter,
	type ClientValidationAdapter,
	type ValidationResult,
	createJsonSchema
} from './adapters.js';
import { memoize } from '$lib/memoize.js';

async function _validate<T extends Type>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
	const result = schema(data);
	if (!(result instanceof type.errors)) {
		return {
			data: result as Infer<T>,
			success: true
		};
	}
	const issues = [];
	for (const error of result) {
		issues.push({ message: error.message, path: error.path });
	}
	return {
		issues,
		success: false
	};
}

function _arktype<T extends Type>(
	schema: T,
	options: RequiredDefaultsOptions<Infer<T>>
): ValidationAdapter<Infer<T>, InferIn<T>> {
	return createAdapter({
		superFormValidationLibrary: 'arktype',
		defaults: options.defaults,
		jsonSchema: createJsonSchema(options),
		validate: async (data) => _validate(schema, data)
	});
}

function _arktypeClient<T extends Type>(schema: T): ClientValidationAdapter<Infer<T>, InferIn<T>> {
	return {
		superFormValidationLibrary: 'arktype',
		validate: async (data) => _validate(schema, data)
	};
}

export const arktype = /* @__PURE__ */ memoize(_arktype);
export const arktypeClient = /* @__PURE__ */ memoize(_arktypeClient);
