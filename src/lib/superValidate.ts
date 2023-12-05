import { validate } from '@decs/typeschema';
import { setPaths } from './traversal.js';
import type { RequestEvent } from '@sveltejs/kit';
import { mapAdapter, type ValidationAdapter } from './adapters/index.js';
import { parseRequest } from './formData.js';
import type { JSONSchema7 } from 'json-schema';
import type { SuperValidated } from './index.js';

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
	const errors = {};

	if (!status.success) {
		if (addErrors) {
			const issues = status.issues;
			setPaths(
				errors,
				issues.map((i) => i.path) as (string | number | symbol)[][],
				(path) => issues.find((i) => i.path == path)?.message
			);
		}
		// Alternative place for parsed.data merging
	}

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
