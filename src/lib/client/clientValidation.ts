import {
	type SuperValidated,
	type ValidationErrors,
	type FieldPath,
	SuperFormError,
	type TaintedFields
} from '../index.js';
import { isInvalidPath, setPaths, traversePath, traversePaths } from '../traversal.js';
import type { FormOptions, SuperForm, TaintOption } from './index.js';
import { mapErrors } from '../errors.js';
import { clone } from '../utils.js';
import { get } from 'svelte/store';
import { mapAdapter, type ValidationResult } from '$lib/adapters/index.js';

export type ValidateOptions<V> = Partial<{
	value: V;
	update: boolean | 'errors' | 'value';
	taint: TaintOption;
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
		const adapter = mapAdapter(validator);
		status = await adapter.process(data);

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

export type ClientValidationResult<T extends Record<string, unknown>> = {
	validated: boolean | 'all';
	errors: string[] | undefined;
	data: T | undefined;
};

export async function validateField<T extends Record<string, unknown>, M>(
	path: (string | number | symbol)[],
	formOptions: FormOptions<T, M>,
	data: SuperForm<T, M>['form'],
	Errors: SuperForm<T, M>['errors'],
	Tainted: SuperForm<T, M>['tainted'],
	options: ValidateOptions<unknown> = {}
): Promise<ClientValidationResult<T>> {
	return await _validateField(path, formOptions.validators, data, Errors, Tainted, options);
}

// @DCI-context
async function _validateField<T extends Record<string, unknown>, M>(
	path: (string | number | symbol)[],
	validators: FormOptions<T, M>['validators'],
	data: SuperForm<T, M>['form'],
	Errors: SuperForm<T, M>['errors'],
	Tainted: SuperForm<T, M>['tainted'],
	options: ValidateOptions<unknown> = {}
): Promise<ClientValidationResult<T>> {
	if (options.update === undefined) options.update = true;
	if (options.taint === undefined) options.taint = false;
	if (typeof options.errors == 'string') options.errors = [options.errors];

	///////////////////////////////////////////////////////////////////

	if (!('value' in options)) {
		// Use value from data
		Context.currentData = get(data);

		const dataToValidate = traversePath(
			Context.currentData,
			path as FieldPath<typeof Context.currentData>
		);

		Context.value = dataToValidate?.value;
	} else if (options.update === true || options.update === 'value') {
		// Value should be updating the data
		data.update(
			($data) => {
				setPaths($data, [path], Context.value);
				return (Context.currentData = $data);
			},
			{ taint: options.taint }
		);
	} else {
		Context.shouldUpdate = false;
	}

	//console.log('🚀 ~ file: index.ts:871 ~ validate:', path, value);

	if (typeof validators !== 'object') {
		return defaultValidate();
	}

	if ('safeParseAsync' in validators) {
		// Zod validator
		if (!Context.shouldUpdate) {
			// If value shouldn't update, clone and set the new value
			Context.currentData = clone(Context.currentData ?? get(data));
			setPaths(Context.currentData, [path], Context.value);
		}

		const result = await (validators as ZodTypeAny).safeParseAsync(Context.currentData);

		if (!result.success) {
			const newErrors = Errors_fromZod(result.error, validators as AnyZodObject);

			if (options.update === true || options.update == 'errors') {
				// Set errors for other (tainted) fields, that may have been changed
				const taintedFields = get(Tainted);

				Errors_update((currentErrors) => {
					// Clear current object-level errors
					traversePaths(currentErrors, (pathData) => {
						if (pathData.key == '_errors') {
							return pathData.set(undefined);
						}
					});

					// Add new object-level errors and tainted field errors
					traversePaths(newErrors, (pathData) => {
						if (
							pathData.key == '_errors' &&
							(pathData.path.length == 1 ||
								Tainted_isPathTainted(pathData.path.slice(0, -1), taintedFields))
						) {
							return setPaths(currentErrors, [pathData.path], pathData.value);
						}

						if (!Array.isArray(pathData.value)) return;

						if (Tainted_isPathTainted(pathData.path, taintedFields)) {
							setPaths(currentErrors, [pathData.path], pathData.value);
						}
						return 'skip';
					});

					return currentErrors;
				});
			}

			// Finally, set errors for the specific field
			// it will be set to undefined if no errors, so the tainted+error check
			// in oninput can determine if errors should be displayed or not.
			const current = traversePath(newErrors, path as FieldPath<typeof newErrors>);

			return {
				validated: true,
				errors: options.errors ?? current?.value,
				data: undefined
			};
		} else {
			Errors_clearAll();
			return {
				validated: true,
				errors: undefined,
				data: result.data // For a successful Zod result, return the possibly transformed data.
			};
		}
	} else {
		// SuperForms validator
		const validator = traversePath(
			validators,
			Context.validationPath as FieldPath<typeof validators>
		);

		if (!validator || validator.value === undefined) {
			// No validator, use default
			return defaultValidate();
		} else {
			const result = (await validator.value(Context.value)) as string[] | undefined;

			return {
				validated: true,
				errors: result ? options.errors ?? result : result,
				data: undefined // No transformation for Superforms validators
			};
		}
	}
}
