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
	formShape: SuperFormValidated<T, M>['shape'],
	recheckValidData = true
) {
	return _clientValidation(
		validators,
		data,
		formId,
		constraints,
		posted,
		formShape,
		recheckValidData
	);
}

async function _clientValidation<T extends Record<string, unknown>, M>(
	validator: FormOptions<T, M>['validators'],
	data: T,
	formId: string,
	constraints: SuperFormValidated<T, M>['constraints'],
	posted: boolean,
	formShape: SuperFormValidated<T, M>['shape'],
	recheckValidData: boolean
): Promise<SuperFormValidated<T, M>> {
	let errors: ValidationErrors<T> = {};
	let status: ValidationResult<Record<string, unknown>> = { success: true, data };

	if (typeof validator == 'object') {
		status = await /* @__PURE__ */ validator.validate(data);

		if (!status.success) {
			errors = mapErrors(status.issues, validator.shape ?? formShape ?? {}) as ValidationErrors<T>;
		} else if (recheckValidData) {
			// need to make an additional validation, in case the data has been transformed
			return _clientValidation(
				validator,
				status.data as T,
				formId,
				constraints,
				posted,
				formShape,
				false // Otherwise, infinite loop
			);
		}
	}

	return {
		valid: status.success,
		posted,
		errors,
		data: status.success ? (status.data as T) : data,
		constraints,
		message: undefined,
		id: formId,
		shape: formShape
	};
}
