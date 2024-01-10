import { type ValidationAdapter, createAdapter } from './adapters.js';
import type { Infer } from '$lib/index.js';
import { type TSchema, FormatRegistry } from '@sinclair/typebox';
import { type TypeCheck, TypeCompiler } from '@sinclair/typebox/compiler';
import { memoize } from '$lib/memoize.js';

// From https://github.com/sinclairzx81/typebox/tree/ca4d771b87ee1f8e953036c95a21da7150786d3e/example/formats
const Email =
	/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

/* @__NO_SIDE_EFFECTS__ */
function _typebox<T extends TSchema>(schema: T): ValidationAdapter<Infer<T>> {
	if (!compiled.has(schema)) {
		compiled.set(schema, TypeCompiler.Compile(schema));
	}

	if (!FormatRegistry.Has('email')) FormatRegistry.Set('email', (value) => Email.test(value));

	return createAdapter({
		superFormValidationLibrary: 'typebox',
		jsonSchema: schema,
		async validate(data) {
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
	});
}

export const typebox = /* @__PURE__ */ memoize(_typebox);

const compiled = new WeakMap<TSchema, TypeCheck<TSchema>>();
