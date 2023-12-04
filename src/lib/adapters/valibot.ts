import type { JSONSchema7 } from 'json-schema';
import { validationAdapter } from './index.js';
import toJsonSchema from 'to-json-schema';
import type { BaseSchema, BaseSchemaAsync } from 'valibot';
import type { Inferred } from '$lib/index.js';

export function valibot<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	options: { defaults: Inferred<T> }
) {
	return validationAdapter<Inferred<T>, 'valibot'>(
		'valibot',
		schema,
		() => ({
			jsonSchema: toJsonSchema(options.defaults) as JSONSchema7,
			defaults: options.defaults
		}),
		[schema, options.defaults]
	);
}
