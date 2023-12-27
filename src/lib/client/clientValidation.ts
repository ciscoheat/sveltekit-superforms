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
import { validate } from '@decs/typeschema';
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
		// Taken from superValidate validator/validate
		status =
			'process' in adapter
				? await adapter.process(data)
				: // TODO: Factorize away typeschema?
					((await validate(adapter.validator, data)) as ValidationResult<T>);

		if (adapter.postProcess) status = await adapter.postProcess(status);

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
	function Errors_clear() {
		//clearErrors(Errors, { undefinePath: path, clearFormLevelErrors: true });
	}

	function Errors_update(errorMsgs: null | undefined | string | string[]) {
		if (typeof errorMsgs === 'string') errorMsgs = [errorMsgs];

		if (options.update === true || options.update == 'errors') {
			Errors.update((errors) => {
				const error = traversePath(errors, path as FieldPath<typeof errors>, (node) => {
					if (isInvalidPath(path, node)) {
						throw new SuperFormError(
							'Errors can only be added to form fields, not to arrays or objects in the schema. Path: ' +
								node.path.slice(0, -1)
						);
					} else if (node.value === undefined) {
						node.parent[node.key] = {};
						return node.parent[node.key];
					} else {
						return node.value;
					}
				});

				if (!error) throw new SuperFormError('Error path could not be created: ' + path);

				error.parent[error.key] = errorMsgs ?? undefined;
				return errors;
			});
		}
		return errorMsgs ?? undefined;
	}

	const result = await _validateField(path, formOptions.validators, data, Errors, Tainted, options);

	if (result.validated) {
		if (result.validated === 'all' && !result.errors) {
			// We validated the whole data structure, so clear all errors on success after delayed validators.
			// it will also set the current path to undefined, so it can be used in
			// the tainted+error check in oninput.
			Errors_clear();
		} else {
			result.errors = Errors_update(result.errors);
		}
	} else if (result.validated === false && formOptions.defaultValidator == 'clear') {
		result.errors = Errors_update(result.errors);
	}

	return result;
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

	const Context = {
		value: options.value,
		shouldUpdate: true,
		currentData: undefined as T | undefined,
		// Remove numeric indices, they're not used for validators.
		validationPath: path.filter((p) => /\D/.test(String(p)))
	};

	async function defaultValidate() {
		return { validated: false, errors: undefined, data: undefined } as const;
	}

	///// Roles ///////////////////////////////////////////////////////

	function Tainted_isPathTainted(
		path: (string | number | symbol)[],
		tainted: TaintedFields<Record<string, unknown>> | undefined
	) {
		if (tainted === undefined) return false;
		const leaf = traversePath(tainted, path as FieldPath<typeof tainted>);
		if (!leaf) return false;
		return leaf.value;
	}

	function Errors_update(updater: Parameters<typeof Errors.update>[0]) {
		Errors.update(updater);
	}

	function Errors_clearAll() {
		clearErrors(Errors, { undefinePath: null, clearFormLevelErrors: true });
	}

	function Errors_fromZod(errors: ZodError<unknown>, validator: Record<string, unknown>) {
		return mapErrors(errors.format(), errorShape(validator));
	}

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
