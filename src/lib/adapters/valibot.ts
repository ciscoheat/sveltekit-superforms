import {
	toJsonSchema,
	type ValidationAdapter,
	validate,
	type AdapterDefaultOptions,
	type RequiredJsonSchemaOptions,
	createAdapter
} from './adapters.js';
import type { BaseSchema, BaseSchemaAsync } from 'valibot';
import type { Inferred } from '$lib/index.js';
import { memoize } from '$lib/memoize.js';

function _valibot<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	options: AdapterDefaultOptions<T> | RequiredJsonSchemaOptions<T>
): ValidationAdapter<Inferred<T>> {
	return createAdapter({
		superFormValidationLibrary: 'valibot',
		validate: validate(schema),
		jsonSchema:
			'jsonSchema' in options
				? options.jsonSchema
				: toJsonSchema(options.defaults, options.schemaOptions),
		defaults: options.defaults
	});
}

export const valibot = memoize(_valibot);
