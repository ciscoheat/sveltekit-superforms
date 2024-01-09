import { type SuperValidated } from '../index.js';
import type { FormOptions } from './index.js';
import { mapErrors } from '../errors.js';
import { createAdapter, type ValidationResult } from '$lib/adapters/index.js';
import type { ValidationErrors } from '$lib/superValidate.js';

export type ValidateOptions<V> = Partial<{
	value: V;
	update: boolean | 'errors' | 'value';
	taint: boolean | 'untaint' | 'untaint-all' | 'ignore';
	errors: string | string[];
}>;

/**
 * Validate form data.
 */
export async function clientValidation<T extends Record<string, unknown>, M = unknown>(
	validators: FormOptions<T, M>['validators'],
	data: T,
	formId: string,
	constraints: SuperValidated<T>['constraints'],
	posted: boolean
) {
	return _clientValidation(validators, data, formId, constraints, posted);
}

async function _clientValidation<T extends Record<string, unknown>, M = unknown>(
	validator: FormOptions<T, M>['validators'],
	data: T,
	formId: string,
	constraints: SuperValidated<T>['constraints'],
	posted: boolean
): Promise<SuperValidated<T>> {
	let errors: ValidationErrors<T> = {};
	let status: ValidationResult<T> = { success: true, data };

	if (validator) {
		const adapter = createAdapter(validator);
		status = await adapter.validate(data);

		if (!status.success) {
			errors = mapErrors(status.issues, adapter.shape) as ValidationErrors<T>;
		}
	}

	return {
		valid: status.success,
		posted,
		errors,
		data: status.success ? status.data : data,
		constraints,
		message: undefined,
		id: formId
	};
}
