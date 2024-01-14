import {
	toJsonSchema,
	type ValidationAdapter,
	type AdapterDefaultOptions,
	type RequiredJsonSchemaOptions,
	type Infer,
	createAdapter,
	type ValidationResult,
	type ClientValidationAdapter
} from './adapters.js';
import { safeParseAsync, type BaseSchema, type BaseSchemaAsync } from 'valibot';
import { memoize } from '$lib/memoize.js';

async function validate<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
	const result = await safeParseAsync(schema, data);
	if (result.success) {
		return {
			data: result.output as Infer<T>,
			success: true
		};
	}
	return {
		issues: result.issues.map(({ message, path }) => ({
			message,
			path: path?.map(({ key }) => key) as string[]
		})),
		success: false
	};
}

function _valibot<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	options: AdapterDefaultOptions<T> | RequiredJsonSchemaOptions<T>
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'valibot',
		validate: async (data) => validate(schema, data),
		jsonSchema:
			'jsonSchema' in options
				? options.jsonSchema
				: toJsonSchema(options.defaults, options.schemaOptions),
		defaults: options.defaults
	});
}

function _valibotClient<T extends BaseSchema | BaseSchemaAsync>(
	schema: T
): ClientValidationAdapter<Infer<T>> {
	return {
		superFormValidationLibrary: 'valibot',
		validate: async (data) => validate(schema, data)
	};
}

export const valibot = /* @__PURE__ */ memoize(_valibot);
export const valibotClient = /* @__PURE__ */ memoize(_valibotClient);
