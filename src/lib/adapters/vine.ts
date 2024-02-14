import {
	type ValidationAdapter,
	createAdapter,
	type ValidationResult,
	type ClientValidationAdapter,
	type ValidationIssue,
	createJsonSchema,
	type RequiredDefaultsOptions,
	type Infer,
	type InferIn
} from './adapters.js';
import { memoize } from '$lib/memoize.js';
import { Vine, errors } from '@vinejs/vine';
import type { SchemaTypes } from '@vinejs/vine/types';

async function validate<T extends SchemaTypes>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
	const vine = new Vine();
	try {
		const output = await vine.validate({ schema, data });
		return {
			success: true,
			data: output as Infer<T>
		};
	} catch (e) {
		if (e instanceof errors.E_VALIDATION_ERROR) {
			return {
				success: false,
				issues: e.messages.map((m: { field: string; message: string }) => ({
					path: [m.field as string],
					message: m.message as string
				})) as Array<ValidationIssue>
			};
		} else {
			return { success: false, issues: [] };
		}
	}
}

function _vine<T extends SchemaTypes>(
	schema: T,
	options: RequiredDefaultsOptions<T>
): ValidationAdapter<Infer<T>, InferIn<T>> {
	return createAdapter({
		superFormValidationLibrary: 'vine',
		validate: async (data: unknown) => validate(schema, data),
		jsonSchema: createJsonSchema(options),
		defaults: options.defaults
	});
}

function _vineClient<T extends SchemaTypes>(
	schema: T
): ClientValidationAdapter<Infer<T>, InferIn<T>> {
	return {
		superFormValidationLibrary: 'vine',
		validate: async (data) => validate(schema, data)
	};
}

export const vine = /* @__PURE__ */ memoize(_vine);
export const vineClient = /* @__PURE__ */ memoize(_vineClient);
