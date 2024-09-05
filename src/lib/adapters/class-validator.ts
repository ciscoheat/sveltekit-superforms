import {
	createAdapter,
	createJsonSchema,
	type ValidationAdapter,
	type Infer,
	type InferIn,
	type ValidationResult,
	type ClientValidationAdapter,
	type RequiredDefaultsOptions,
} from './adapters.js';
import { memoize } from '$lib/memoize.js';

import {
	validate as classValidatorValidate,
	type Schema
} from '@typeschema/class-validator';

async function validate<T extends Schema>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
	const result = await classValidatorValidate<T>(schema, data);
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

function _classValidator<T extends Schema>(
	schema: T,
	options: RequiredDefaultsOptions<Infer<T>>
): ValidationAdapter<Infer<T>, InferIn<T>> {
	return createAdapter({
		superFormValidationLibrary: 'classValidator',
		validate: async (data: unknown) => validate(schema, data),
		jsonSchema: createJsonSchema(options),
		defaults: options.defaults
	});
}

function _classValidatorClient<T extends Schema>(
	schema: T
): ClientValidationAdapter<Infer<T>, InferIn<T>> {
	return {
		superFormValidationLibrary: 'classValidator',
		validate: async (data) => validate(schema, data)
	};
}

export const classValidator = /* @__PURE__ */ memoize(_classValidator);
export const classValidatorClient = /* @__PURE__ */ memoize(_classValidatorClient);
