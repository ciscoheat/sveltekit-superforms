import { toJsonSchema, type SchemaOptions, type ValidationAdapter, adapter } from './index.js';
import type { BaseSchema, BaseSchemaAsync } from 'valibot';
import type { Inferred } from '$lib/index.js';

function _valibot<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	options: { defaults: Inferred<T>; schemaOptions?: SchemaOptions }
): ValidationAdapter<Inferred<T>> {
	return {
		superFormValidationLibrary: 'valibot',
		validator: schema,
		jsonSchema: toJsonSchema(options.defaults, options.schemaOptions),
		defaults: options.defaults
	};
}

export const valibot = adapter(_valibot);
