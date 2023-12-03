import type { Schema } from '@decs/typeschema';
import type { Inferred, SuperValidated } from './index.js';
import { validate } from '@decs/typeschema';
import { setPaths } from './traversal.js';
import type { RequestEvent } from '@sveltejs/kit';
import merge from 'ts-deepmerge';
import type { ValidationAdapter, ValidationLibrary } from './adapters/index.js';
import { parseRequest } from './formData.js';

//import { ZodSchemaMeta } from './schemaMeta/zod.js';
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
}>;

export async function superValidate<
	T extends Schema,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	adapter: ValidationAdapter<T, ValidationLibrary>,
	options?: SuperValidateOptions<Inferred<T>>
): Promise<SuperValidated<Inferred<T>, M>>;

export async function superValidate<
	T extends Schema,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	data: SuperValidateData<Inferred<T>>,
	adapter: ValidationAdapter<T, ValidationLibrary>,
	options?: SuperValidateOptions<Inferred<T>>
): Promise<SuperValidated<Inferred<T>, M>>;

/**
 * Validates a schema for data validation and usage in superForm.
 * @param data Data corresponding to a schema, or RequestEvent/FormData/URL. If falsy, the schema's default values will be used.
 * @param schema The schema to validate against.
 */
export async function superValidate<
	T extends Schema,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	data: ValidationAdapter<T, ValidationLibrary> | SuperValidateData<Inferred<T>>,
	adapter?:
		| ValidationAdapter<T, ValidationLibrary>
		| SuperValidateData<Inferred<T>>
		| SuperValidateOptions<Inferred<T>>,
	options?: SuperValidateOptions<Inferred<T>>
): Promise<SuperValidated<Inferred<T>, M>> {
	let validation: ValidationAdapter<T, ValidationLibrary>;

	if (data && 'superFormValidationLibrary' in data) {
		options = adapter as SuperValidateOptions<Inferred<T>>;
		validation = data;
		data = undefined;
	} else {
		validation = adapter as ValidationAdapter<T, ValidationLibrary>;
	}

	// Set to undefined, to spot compilation errors
	adapter = undefined;

	const addErrors = options?.errors !== undefined ? options.errors : !!data;

	const parsed = await parseRequest<Inferred<T>>(data, validation.jsonSchema, options);
	const shouldValidate = !!(parsed.data || addErrors);

	const status = shouldValidate
		? await validate(validation.schema, parsed.data ?? validation.defaults)
		: { success: false, issues: [] };

	if (!status.success) {
		const errors = {};

		if (addErrors) {
			const issues = status.issues;
			setPaths(
				errors,
				issues.map((i) => i.path) as (string | number | symbol)[][],
				(path) => issues.find((i) => i.path == path)?.message
			);
		}

		parsed.data = merge(validation.defaults, parsed.data ?? {}) as Inferred<T>;

		return {
			id: parsed.id,
			valid: false,
			posted: parsed.posted,
			errors,
			data: parsed.data as Inferred<T>,
			constraints: validation.constraints,
			message: undefined
		};
	}

	return {
		id: parsed.id,
		valid: true,
		posted: parsed.posted,
		errors: {},
		data: data as Inferred<T>,
		constraints: validation.constraints,
		message: undefined
	};
}
