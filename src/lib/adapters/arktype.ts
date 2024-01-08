import type { Type } from 'arktype';
import {
	toJsonSchema,
	type ValidationAdapter,
	adapter,
	process,
	type AdapterDefaultOptions,
	type RequiredJsonSchemaOptions
} from './index.js';
import type { Inferred } from '$lib/index.js';

function _arktype<T extends Type>(
	schema: T,
	options: AdapterDefaultOptions<T> | RequiredJsonSchemaOptions<T>
): ValidationAdapter<Inferred<T>> {
	return {
		superFormValidationLibrary: 'arktype',
		process: process(schema),
		jsonSchema:
			'jsonSchema' in options
				? options.jsonSchema
				: toJsonSchema(options.defaults, options.schemaOptions),
		defaults: options.defaults
	};
}

export const arktype = adapter(_arktype);
