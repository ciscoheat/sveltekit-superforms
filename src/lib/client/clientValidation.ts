import type { FormOptions } from './index.js';
import { mapErrors } from '../errors.js';
import { type ValidationResult } from '$lib/adapters/adapters.js';
import type { SuperFormValidated, ValidationErrors } from '$lib/superValidate.js';

/**
 * Validate form data.
 */
export async function clientValidation<T extends Record<string, unknown>, M>(
	validators: FormOptions<T, M>['validators'],
	data: T,
	formId: string,
	constraints: SuperFormValidated<T, M>['constraints'],
	posted: boolean,
	formShape: SuperFormValidated<T, M>['shape']
) {
	return _clientValidation(validators, data, formId, constraints, posted, formShape);
}

async function _clientValidation<T extends Record<string, unknown>, M>(
	validator: FormOptions<T, M>['validators'],
	data: T,
	formId: string,
	constraints: SuperFormValidated<T, M>['constraints'],
	posted: boolean,
	formShape: SuperFormValidated<T, M>['shape']
): Promise<SuperFormValidated<T, M>> {
	let errors: ValidationErrors<T> = {};
	let status: ValidationResult<T> = { success: true, data };

	if (validator) {
		status = await /* @__PURE__ */ validator.validate(data);

		if (!status.success) {
			errors = mapErrors(status.issues, validator.shape ?? formShape ?? {}) as ValidationErrors<T>;
		}
	}

	return {
		valid: status.success,
		posted,
		errors,
		data: status.success ? status.data : data,
		constraints,
		message: undefined,
		id: formId,
		shape: formShape
	};
}
