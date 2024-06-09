import type { IValidation } from 'typia';
import {
	type ValidationAdapter,
	type ValidationIssue,
	type RequiredDefaultsOptions,
	createAdapter,
	type ClientValidationAdapter,
	type ValidationResult,
	createJsonSchema
} from './adapters.js';
import { memoize } from '$lib/memoize.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Validation<O = any> = (input: unknown) => IValidation<O>;
type OutputType<T> = T extends Validation<infer O> ? O : never;

async function _validate<T extends Validation>(
	validate: T,
	data: unknown
): Promise<ValidationResult<OutputType<T>>> {
	const result = validate(data);
	if (result.success) {
		return {
			data: result.data,
			success: true
		};
	}

	const issues: ValidationIssue[] = [];
	for (const { expected, value, path } of result.errors) {
		issues.push({
			path: [path.replace('$input.', '')],
			message: JSON.stringify({ expected, value })
		});
	}

	return {
		issues,
		success: false
	};
}

function _typia<T extends Validation>(
	validate: T,
	options: RequiredDefaultsOptions<OutputType<T>>
): ValidationAdapter<OutputType<T>> {
	return createAdapter({
		superFormValidationLibrary: 'typia',
		defaults: options.defaults,
		jsonSchema: createJsonSchema(options),
		validate: async (data) => _validate(validate, data)
	});
}

function _typiaClient<T extends Validation>(
	validate: T
): ClientValidationAdapter<ReturnType<typeof _validate<T>>> {
	return {
		superFormValidationLibrary: 'typia',
		validate: async (data) => _validate(validate, data)
	};
}

export const typia = /* @__PURE__ */ memoize(_typia);
export const typiaClient = /* @__PURE__ */ memoize(_typiaClient);
