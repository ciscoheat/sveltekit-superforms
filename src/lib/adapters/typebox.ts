import {
	type ValidationAdapter,
	createAdapter,
	type Infer,
	type InferIn,
	type ValidationResult,
	type ClientValidationAdapter
} from './adapters.js';
import type { TSchema } from 'typebox';
import type { Validator } from 'typebox/compile';
import { memoize } from '$lib/memoize.js';
import Type from 'typebox';

/**
 * Custom TypeBox type for Date for testing purposes.
 */
export class TDate extends Type.Base<globalThis.Date> {
	public override Check(value: unknown): value is globalThis.Date {
		return value instanceof globalThis.Date;
	}
	public override Errors(value: unknown): object[] {
		return this.Check(value) ? [] : [{ message: 'must be Date' }];
	}
	public override Create(): globalThis.Date {
		return new globalThis.Date(0);
	}
}

/**
 * Custom TypeBox type for Date for testing purposes.
 */
export function Date(): TDate {
	return new TDate();
}

// From https://github.com/sinclairzx81/typebox/tree/ca4d771b87ee1f8e953036c95a21da7150786d3e/example/formats
const Email =
	/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

async function modules() {
	const { Compile } = await import(/* webpackIgnore: true */ 'typebox/compile');
	const Format = await import(/* webpackIgnore: true */ 'typebox/format');
	return { Compile, Format };
}

const fetchModule = /* @__PURE__ */ memoize(modules);

async function validate<T extends TSchema>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T, 'typebox'>>> {
	const { Compile, Format } = await fetchModule();

	if (!compiled.has(schema)) {
		compiled.set(schema, Compile(schema));
	}

	if (!Format.Has('email')) {
		Format.Set('email', (value: string) => Email.test(value));
	}

	const validator = compiled.get(schema);
	const errors = [...(validator?.Errors(data) ?? [])];

	if (!errors.length) {
		return { success: true, data: data as Infer<T, 'typebox'> };
	}

	return {
		success: false,
		issues: errors.map((issue) => ({
			path: issue.instancePath ? issue.instancePath.substring(1).split('/') : [],
			message: issue.message
		}))
	};
}

function _typebox<T extends TSchema>(
	schema: T
): ValidationAdapter<Infer<T, 'typebox'>, InferIn<T, 'typebox'>> {
	return createAdapter({
		superFormValidationLibrary: 'typebox',
		validate: async (data: unknown) => validate(schema, data),
		jsonSchema: schema
	});
}

function _typeboxClient<T extends TSchema>(
	schema: T
): ClientValidationAdapter<Infer<T, 'typebox'>, InferIn<T, 'typebox'>> {
	return {
		superFormValidationLibrary: 'typebox',
		validate: async (data) => validate(schema, data)
	};
}

export const typebox = /* @__PURE__ */ memoize(_typebox);
export const typeboxClient = /* @__PURE__ */ memoize(_typeboxClient);

const compiled = new WeakMap<TSchema, Validator<{}, TSchema>>();
