import {
	createAdapter,
	createJsonSchema,
	type ValidationAdapter,
	type Infer,
	type InferIn,
	type ValidationResult,
	type ClientValidationAdapter,
	type RequiredDefaultsOptions
} from './adapters.js';
import { memoize } from '$lib/memoize.js';
import type { Schema } from '@typeschema/class-validator';

async function modules() {
	const { validate } = await import(/* webpackIgnore: true */ '@typeschema/class-validator');
	return { validate };
}

const fetchModule = /* @__PURE__ */ memoize(modules);

async function validate<T extends Schema>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
	const { validate } = await fetchModule();
	const result = await validate<T>(schema, data);
	if (result.success) {
		return {
			data: result.data as Infer<T>,
			success: true
		};
	}
	return {
		issues: result.issues.map(({ message, path }) => ({
			message,
			path
		})),
		success: false
	};
}

function _classvalidator<T extends Schema>(
	schema: T,
	options: RequiredDefaultsOptions<Infer<T>>
): ValidationAdapter<Infer<T>, InferIn<T>> {
	return createAdapter({
		superFormValidationLibrary: 'classvalidator',
		validate: async (data: unknown) => validate(schema, data),
		jsonSchema: createJsonSchema(options),
		defaults: options.defaults
	});
}

function _classvalidatorClient<T extends Schema>(
	schema: T
): ClientValidationAdapter<Infer<T>, InferIn<T>> {
	return {
		superFormValidationLibrary: 'classvalidator',
		validate: async (data) => validate(schema, data)
	};
}

export const classvalidator = /* @__PURE__ */ memoize(_classvalidator);
export const classvalidatorClient = /* @__PURE__ */ memoize(_classvalidatorClient);
