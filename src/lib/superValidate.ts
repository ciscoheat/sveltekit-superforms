import { validate, type ValidationIssue } from '@decs/typeschema';
import { pathExists, traversePath } from './traversal.js';
import { ActionFailure, fail, type RequestEvent } from '@sveltejs/kit';
import { mapAdapter, type ValidationAdapter } from './adapters/index.js';
import { parseRequest } from './formData.js';
import type { JSONSchema7 } from 'json-schema';
import { SuperFormError, type SuperValidated } from './index.js';
import type { NumericRange } from './utils.js';
import { splitPath, type StringPathLeaves } from './stringPath.js';
import type { ObjectShape } from './jsonSchema/objectShape.js';

//type NeedDefaults<T extends Schema> = Lib<T> extends 'zod' ? false : true;
//type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

type SuperValidateSyncData<T extends object> =
	| FormData
	| URLSearchParams
	| URL
	| Partial<T>
	| null
	| undefined;

type SuperValidateData<T extends object> = RequestEvent | Request | SuperValidateSyncData<T>;

export type SuperValidateOptions<T extends object> = Partial<{
	errors: boolean;
	id: string;
	preprocessed: (keyof T)[];
	defaults: T;
	jsonSchema: JSONSchema7;
}>;

export async function superValidate<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(adapter: ValidationAdapter<T>, options?: SuperValidateOptions<T>): Promise<SuperValidated<T, M>>;

export async function superValidate<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	data: SuperValidateData<T>,
	adapter: ValidationAdapter<T>,
	options?: SuperValidateOptions<T>
): Promise<SuperValidated<T, M>>;

/**
 * Validates a schema for data validation and usage in superForm.
 * @param data Data corresponding to a schema, or RequestEvent/FormData/URL. If falsy, the schema's default values will be used.
 * @param schema The schema to validate against.
 */
export async function superValidate<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	data: ValidationAdapter<T> | SuperValidateData<T>,
	adapter?: ValidationAdapter<T> | SuperValidateData<T> | SuperValidateOptions<T>,
	options?: SuperValidateOptions<T>
): Promise<SuperValidated<T, M>> {
	if (data && 'superFormValidationLibrary' in data) {
		options = adapter as SuperValidateOptions<T>;
		adapter = data;
		data = undefined;
	}

	const validation = mapAdapter(adapter as ValidationAdapter<T>);

	const defaults = options?.defaults ?? validation.defaults;
	const jsonSchema = options?.jsonSchema ?? validation.jsonSchema;
	const addErrors = options?.errors !== undefined ? options.errors : !!data;

	const parsed = await parseRequest<T>(data, jsonSchema, options);
	const hasData = parsed.data;

	// TODO: Decide whether to merge here or where validation fails
	/*
		All data may not be present here (missing FormData field, for example)
		Merge defaults to make data type-safe.
		This makes for nicer error messages, but does not completely correspond to
		what was posted. But since this library is about forms, it may be ok.
	*/
	parsed.data = { ...defaults, ...(parsed.data ?? {}) } as T;

	const status =
		hasData || addErrors
			? validation.customValidator
				? await validation.customValidator(parsed.data ?? defaults)
				: await validate(validation.validator, parsed.data ?? defaults)
			: { success: false, issues: [] };

	const valid = status.success;
	const errors = valid || !addErrors ? {} : mapErrors(status.issues, validation.objects);

	// Alternative place for parsed.data merging

	return {
		id: parsed.id,
		valid,
		posted: parsed.posted,
		errors,
		// TODO: Copy data or return same object? (Probably copy, to be consistent with fail behavior)
		// TODO: Strip keys not belonging to schema? (additionalProperties)
		data: (valid ? { ...data } : parsed.data) as T,
		constraints: validation.constraints,
		message: undefined
	};
}

function mapErrors(errors: ValidationIssue[], shape: ObjectShape) {
	//console.log('===', errors.length, 'errors', shape);
	const output: Record<string, unknown> = {};
	for (const error of errors) {
		if (!error.path) continue;
		const objectError = pathExists(shape, error.path)?.value;
		//console.log(objectError ? '[OBJ]' : '', error.path, error.message);

		const leaf = traversePath(output, error.path, ({ value, parent, key }) => {
			if (value === undefined) parent[key] = {};
			return parent[key];
		});

		if (!leaf) throw new SuperFormError('Error leaf should exist.');

		const { parent, key } = leaf;

		if (objectError) {
			if (!(key in parent)) parent[key] = { _errors: [error.message] };
			else parent[key]._errors.push(error.message);
		} else {
			if (!(key in parent)) parent[key] = [error.message];
			else parent[key].push(error.message);
		}

		//console.log(parent, leaf.path, objectError ? '[OBJ]' : '');
	}
	return output;
}

/**
 * Sends a message with a form, with an optional HTTP status code that will set
 * form.valid to false if status >= 400. A status lower than 400 cannot be sent.
 */
export function message<T extends Record<string, unknown>, M>(
	form: SuperValidated<T, M>,
	message: M,
	options?: {
		status?: NumericRange<400, 599>;
	}
) {
	if (options?.status && options.status >= 400) {
		form.valid = false;
	}

	form.message = message;
	return !form.valid ? fail(options?.status ?? 400, { form }) : { form };
}

export const setMessage = message;

type SetErrorOptions = {
	overwrite?: boolean;
	status?: NumericRange<400, 599>;
};

/**
 * Sets a form-level error.
 * form.valid is automatically set to false.
 *
 * @param {SuperValidated<T, unknown>} form A validation object, usually returned from superValidate.
 * @param {string | string[]} error Error message(s).
 * @param {SetErrorOptions} options Option to overwrite previous errors and set a different status than 400. The status must be in the range 400-599.
 * @returns fail(status, { form })
 */
export function setError<T extends Record<string, unknown>>(
	form: SuperValidated<T, unknown>,
	error: string | string[],
	options?: SetErrorOptions
): ActionFailure<{ form: SuperValidated<T, unknown> }>;

/**
 * Sets an error for a form field or array field.
 * form.valid is automatically set to false.
 *
 * @param {SuperValidated<T, unknown>} form A validation object, usually returned from superValidate.
 * @param {'' | StringPathLeaves<T, '_errors'>} path Path to the form field. Use an empty string to set a form-level error. Array-level errors can be set by appending "._errors" to the field.
 * @param {string | string[]} error Error message(s).
 * @param {SetErrorOptions} options Option to overwrite previous errors and set a different status than 400. The status must be in the range 400-599.
 * @returns fail(status, { form })
 */
export function setError<T extends Record<string, unknown>>(
	form: SuperValidated<T, unknown>,
	path: '' | StringPathLeaves<T, '_errors'>,
	error: string | string[],
	options?: SetErrorOptions
): ActionFailure<{ form: SuperValidated<T, unknown> }>;

export function setError<T extends Record<string, unknown>>(
	form: SuperValidated<T, unknown>,
	path: string | string[] | (string & StringPathLeaves<T, '_errors'>),
	error?: string | string[] | SetErrorOptions,
	options?: SetErrorOptions
): ActionFailure<{ form: SuperValidated<T, unknown> }> {
	// Unify signatures
	if (error == undefined || (typeof error !== 'string' && !Array.isArray(error))) {
		options = error;
		error = path;
		path = '';
	}

	if (options === undefined) options = {};

	const errArr = Array.isArray(error) ? error : [error];

	if (!form.errors) form.errors = {};

	if (path === null || path === '') {
		if (!form.errors._errors) form.errors._errors = [];
		form.errors._errors = options.overwrite ? errArr : form.errors._errors.concat(errArr);
	} else {
		const realPath = splitPath(path as string);

		const leaf = traversePath(form.errors, realPath, ({ parent, key, value }) => {
			if (value === undefined) parent[key] = {};
			return parent[key];
		});

		if (leaf) {
			leaf.parent[leaf.key] =
				Array.isArray(leaf.value) && !options.overwrite ? leaf.value.concat(errArr) : errArr;
		}
	}

	form.valid = false;
	return fail(options.status ?? 400, { form });
}
