import type { ValidationAdapter } from './index.js';
import toJsonSchema from 'to-json-schema';
import type { BaseSchema, BaseSchemaAsync } from 'valibot';
import type { Inferred } from '$lib/index.js';
import type { JSONSchema } from '$lib/jsonSchema.js';
import { memoize } from '$lib/memoize.js';

function _valibot<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	options: { defaults: Inferred<T> }
): ValidationAdapter<Inferred<T>> {
	return {
		superFormValidationLibrary: 'valibot',
		validator: schema,
		jsonSchema: toJsonSchema(options.defaults) as JSONSchema,
		defaults: options.defaults
	};
}

export const valibot = memoize(_valibot);
