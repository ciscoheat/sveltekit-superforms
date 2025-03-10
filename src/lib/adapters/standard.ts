import { memoize } from "$lib/memoize.js";
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
	createAdapter,
	createJsonSchema,
	type ClientValidationAdapter,
	type Infer,
	type InferIn,
	type RequiredDefaultsOptions,
	type ValidationAdapter,
	type ValidationResult
} from './adapters.js';

async function _validate<T extends StandardSchemaV1>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T, 'standard'>>> {
	const result = await schema['~standard'].validate(data);
	if ('value' in result) return { success: true, data: result.value as Infer<T, 'standard'> };
	else {
		return {
			success: false,
			issues: [
				...result.issues.map((i) => ({
					message: i.message,
					path: i.path?.map((p) => (typeof p === 'object' && 'key' in p ? p.key : p))
				}))
			]
		} as const;
	}
}

function _standard<T extends StandardSchemaV1>(
	schema: T,
	options: RequiredDefaultsOptions<Infer<T, 'standard'>>
): ValidationAdapter<Infer<T, 'standard'>, InferIn<T, 'standard'>> {
	return createAdapter({
		superFormValidationLibrary: 'standard',
		validate: (data) => _validate(schema, data),
		jsonSchema: createJsonSchema(options),
		defaults: options.defaults
	});
}

function _standardClient<T extends StandardSchemaV1>(
	schema: T
): ClientValidationAdapter<Infer<T, 'standard'>, InferIn<T, 'standard'>> {
	return {
		superFormValidationLibrary: 'standard',
		validate: async (data) => _validate(schema, data)
	};
}

export const standard = /* @__PURE__ */ memoize(_standard);
export const standardClient = /* @__PURE__ */ memoize(_standardClient);