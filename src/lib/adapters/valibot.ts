import type { JSONSchema7 } from 'json-schema';
import { baseAdapter, type ValidationAdapter } from './index.js';
import toJsonSchema from 'to-json-schema';
import type { BaseSchema, BaseSchemaAsync } from 'valibot';
import type { Inferred } from '$lib/index.js';

export function valibot<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	defaults: Inferred<T>
): ValidationAdapter<T, 'valibot'> {
	return baseAdapter<T, 'valibot'>('valibot', schema, {
		defaults,
		jsonSchema: toJsonSchema(defaults) as JSONSchema7
	});
}
