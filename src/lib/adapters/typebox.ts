import {
	type ValidationAdapter,
	createAdapter,
	type Infer,
	type InferIn,
	type ValidationResult,
	type ClientValidationAdapter
} from './adapters.js';
import type { TSchema } from '@sinclair/typebox';
import type { TypeCheck } from '@sinclair/typebox/compiler';
import { memoize } from '$lib/memoize.js';

// From https://github.com/sinclairzx81/typebox/tree/ca4d771b87ee1f8e953036c95a21da7150786d3e/example/formats
const Email =
	/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

async function modules() {
	const { TypeCompiler } = await import(/* webpackIgnore: true */ '@sinclair/typebox/compiler');
	const { FormatRegistry } = await import(/* webpackIgnore: true */ '@sinclair/typebox');
	const { SetErrorFunction, DefaultErrorFunction } = await import(/* webpackIgnore: true */'@sinclair/typebox/errors');

	return { TypeCompiler, FormatRegistry, SetErrorFunction, DefaultErrorFunction };
}

const fetchModule = /* @__PURE__ */ memoize(modules);

async function validate<T extends TSchema>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
	const { TypeCompiler, FormatRegistry, SetErrorFunction, DefaultErrorFunction } = await fetchModule();

	/** https://github.com/sinclairzx81/typebox/discussions/723#discussioncomment-8075718 */
	SetErrorFunction(param => {
		return typeof param.schema.errorMessage === 'string'
			? param.schema.errorMessage
			: DefaultErrorFunction(param);
	});

	if (!compiled.has(schema)) {
		compiled.set(schema, TypeCompiler.Compile(schema));
	}

	if (!FormatRegistry.Has('email')) {
		FormatRegistry.Set('email', (value) => Email.test(value));
	}

	const validator = compiled.get(schema);
	const errors = [...(validator?.Errors(data) ?? [])];

	if (!errors.length) {
		return { success: true, data: data as Infer<T> };
	}

	return {
		success: false,
		issues: errors.map((issue) => ({
			path: issue.path.substring(1).split('/'),
			message: issue.message
		}))
	};
}

function _typebox<T extends TSchema>(schema: T): ValidationAdapter<Infer<T>, InferIn<T>> {
	return createAdapter({
		superFormValidationLibrary: 'typebox',
		validate: async (data: unknown) => validate(schema, data),
		jsonSchema: schema
	});
}

function _typeboxClient<T extends TSchema>(
	schema: T
): ClientValidationAdapter<Infer<T>, InferIn<T>> {
	return {
		superFormValidationLibrary: 'typebox',
		validate: async (data) => validate(schema, data)
	};
}

export const typebox = /* @__PURE__ */ memoize(_typebox);
export const typeboxClient = /* @__PURE__ */ memoize(_typeboxClient);

const compiled = new WeakMap<TSchema, TypeCheck<TSchema>>();
