import type { Infer, Schema } from '@decs/typeschema';
import { SuperFormError, type InputConstraints, type SuperValidated } from './index.js';
import { validate } from '@decs/typeschema';
import { setPaths } from './traversal.js';
import type { BaseSchema, BaseSchemaAsync } from 'valibot';
import type { AnyZodObject, ZodEffects, ZodSchema } from 'zod';
import type { RequestEvent } from '@sveltejs/kit';
import merge from 'ts-deepmerge';
import { schemaType } from './schemaMeta/index.js';
import { ZodSchemaMeta } from './schemaMeta/zod.js';

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

type Inferred<T extends Schema> = NonNullable<Infer<T>>;

//type NeedDefaults<T extends Schema> = Lib<T> extends 'zod' ? false : true;

type _SuperValidateOptions<T extends object> = Partial<{
	errors: boolean;
	id: string;
	warnings: {
		multipleRegexps?: boolean;
		multipleSteps?: boolean;
	};
	preprocessed: (keyof T)[];
	defaults: T;
}>;

type SuperValidateSyncData<T extends object> =
	| FormData
	| URLSearchParams
	| URL
	| Partial<T>
	| null
	| undefined;

type SuperValidateData<T extends object> = RequestEvent | Request | SuperValidateSyncData<T>;

export type SuperValidateOptions<
	T extends object,
	NeedDefaults extends boolean
> = NeedDefaults extends true
	? WithRequired<_SuperValidateOptions<T>, 'defaults'>
	: _SuperValidateOptions<T>;

type Lib<T extends Schema> = T extends BaseSchema | BaseSchemaAsync
	? 'valibot'
	: T extends AnyZodObject | ZodEffects<AnyZodObject>
	  ? 'zod'
	  : 'unknown';

type SupportsConstraints<T extends Schema> = Lib<T> extends 'zod'
	? 'with-constraints'
	: 'no-constraints';

/*
type RequiresDefaults<T extends Schema> = T extends ZodSchema
	? 'schema-defaults'
	: 'requires-defaults';
*/

export async function superValidate<
	T extends ZodSchema,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	schema: T,
	data?: SuperValidateData<Inferred<T>>,
	options?: SuperValidateOptions<Inferred<T>, false>
): Promise<SuperValidated<Inferred<T>, M, SupportsConstraints<T>>>;

export async function superValidate<
	T extends Exclude<Schema, ZodSchema>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	schema: T,
	data: SuperValidateData<Inferred<T>> | SuperValidateOptions<Inferred<T>, true>,
	options: SuperValidateOptions<Inferred<T>, true>
): Promise<SuperValidated<Inferred<T>, M, SupportsConstraints<T>>>;

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
	schema: T,
	data?: SuperValidateData<Inferred<T>>,
	options?: SuperValidateOptions<Inferred<T>, boolean>
): Promise<SuperValidated<Inferred<T>, M, SupportsConstraints<T>>> {
	const addErrors = options?.errors !== undefined ? options.errors : !!data;
	let constraints: InputConstraints<Inferred<T>> = {};
	let defaults: Inferred<T> | undefined = options?.defaults ? options.defaults : undefined;

	switch (schemaType(schema)) {
		case 'zod': {
			const meta = new ZodSchemaMeta(schema as AnyZodObject);
			defaults = meta.defaults as Inferred<T>;
			constraints = meta.constraints;
			break;
		}
	}

	if (!defaults) {
		throw new SuperFormError('options.defaults must be specified.');
	}

	data = merge(defaults, data ?? {}) as Inferred<T>;

	const status = await validate(schema, data);

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

		return {
			valid: false,
			//posted: false,
			errors,
			data: data as Inferred<T>,
			constraints
			//message
			//id
		};
	}

	return {
		valid: true,
		//posted: false,
		errors: {},
		data: data as Inferred<T>,
		constraints
		//message
		//id
	};
}
