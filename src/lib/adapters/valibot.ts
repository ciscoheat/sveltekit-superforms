import {
	toJsonSchema,
	type ValidationAdapter,
	adapter,
	process,
	type AdapterDefaultOptions,
	type RequiredJsonSchemaOptions
} from './index.js';
import type { BaseSchema, BaseSchemaAsync } from 'valibot';
import type { Inferred } from '$lib/index.js';

function _valibot<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	options: AdapterDefaultOptions<T> | RequiredJsonSchemaOptions<T>
): ValidationAdapter<Inferred<T>> {
	return {
		superFormValidationLibrary: 'valibot',
		process: process(schema),
		jsonSchema:
			'jsonSchema' in options
				? options.jsonSchema
				: toJsonSchema(options.defaults, options.schemaOptions),
		defaults: options.defaults
	};
}

export const valibot = adapter(_valibot);
