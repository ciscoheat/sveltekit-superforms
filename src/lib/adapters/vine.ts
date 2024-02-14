import {
	type ValidationAdapter,
	createAdapter,
	type ValidationResult,
	type ClientValidationAdapter,
	type ValidationIssue,
	createJsonSchema,
	type RequiredDefaultsOptions
} from './adapters.js';
import { memoize } from '$lib/memoize.js';
import { Vine, errors } from '@vinejs/vine';
import type { SchemaTypes } from '@vinejs/vine/types';

async function validate<T extends SchemaTypes>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Record<string, unknown>>> {
	let res = null;
	const vine = new Vine();
	try {
		const output = await vine.validate({ schema, data });
		res = {
			success: true,
			data: output as Record<string, unknown>
		};
	} catch (e) {
		if (e instanceof errors.E_VALIDATION_ERROR) {
			res = {
				success: false,
				issues: e.messages.map((m: { field: string; message: string }) => ({
					path: [m.field as string],
					message: m.message as string
				})) as Array<ValidationIssue>
			};
		}
	} finally {
		if (res === null) {
			return { success: false, issues: [] };
		}
		return res as ValidationResult<Record<string, unknown>>;
	}
}

function _vine<T extends SchemaTypes>(
	schema: T,
	options: RequiredDefaultsOptions<T>
): ValidationAdapter<Record<string, unknown>> {
	return createAdapter({
		superFormValidationLibrary: 'vine',
		validate: async (data: unknown) => validate(schema, data),
		jsonSchema: createJsonSchema(options),
		defaults: options.defaults
	});
}

function _vineClient<T extends SchemaTypes>(
	schema: T
): ClientValidationAdapter<Record<string, unknown>> {
	return {
		superFormValidationLibrary: 'vine',
		validate: async (data) => validate(schema, data)
	};
}

export const vine = /* @__PURE__ */ memoize(_vine);
export const vineClient = /* @__PURE__ */ memoize(_vineClient);
