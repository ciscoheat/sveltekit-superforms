import {
	createAdapter,
	createJsonSchema,
	type ValidationAdapter,
	type ValidationResult,
	type ClientValidationAdapter,
	type RequiredDefaultsOptions,
	type Infer,
	type InferIn
} from './adapters.js';
import { memoize } from '$lib/memoize.js';
import type { SchemaTypes } from '@vinejs/vine/types';

async function modules() {
	const { Vine, errors } = await import(/* webpackIgnore: true */ '@vinejs/vine');
	return { Vine, errors };
}

const fetchModule = /* @__PURE__ */ memoize(modules);

async function validate<T extends SchemaTypes>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T, 'vine'>>> {
	const { Vine, errors } = await fetchModule();
	try {
		const output = await new Vine().validate({ schema, data });
		return {
			success: true,
			data: output as Infer<T, 'vine'>
		};
	} catch (e) {
		if (e instanceof errors.E_VALIDATION_ERROR) {
			return {
				success: false,
				issues: e.messages.map((m: { field: string; message: string }) => ({
					path: m.field.split('.'),
					message: m.message
				}))
			};
		} else {
			return { success: false, issues: [] };
		}
	}
}

function _vine<T extends SchemaTypes>(
	schema: T,
	options: RequiredDefaultsOptions<Infer<T, 'vine'>>
): ValidationAdapter<Infer<T, 'vine'>, InferIn<T, 'vine'>> {
	return createAdapter({
		superFormValidationLibrary: 'vine',
		validate: async (data: unknown) => validate(schema, data),
		jsonSchema: createJsonSchema(options),
		defaults: options.defaults
	});
}

function _vineClient<T extends SchemaTypes>(
	schema: T
): ClientValidationAdapter<Infer<T, 'vine'>, InferIn<T, 'vine'>> {
	return {
		superFormValidationLibrary: 'vine',
		validate: async (data) => validate(schema, data)
	};
}

export const vine = /* @__PURE__ */ memoize(_vine);
export const vineClient = /* @__PURE__ */ memoize(_vineClient);
