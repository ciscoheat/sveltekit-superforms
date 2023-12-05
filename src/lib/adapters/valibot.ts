import type { ValidationAdapter } from './index.js';
import toJsonSchema from 'to-json-schema';
import type { BaseSchema, BaseSchemaAsync } from 'valibot';
import type { Inferred } from '$lib/index.js';
import type { JSONSchema } from '$lib/jsonSchema.js';

export function valibot<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	options: { defaults: Inferred<T> }
): ValidationAdapter<Inferred<T>> {
	return {
		superFormValidationLibrary: 'valibot',
		validator() {
			return schema;
		},
		jsonSchema() {
			return toJsonSchema(options.defaults) as JSONSchema;
		},
		cacheKeys: [schema, options.defaults],
		defaults: options.defaults
	};
}
