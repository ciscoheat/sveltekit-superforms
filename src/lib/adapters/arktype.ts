import type { Type } from 'arktype';
import {
	toJsonSchema,
	type SchemaOptions,
	type ValidationAdapter,
	adapter,
	process
} from './index.js';
import type { Inferred } from '$lib/index.js';

function _arktype<T extends Type>(
	schema: T,
	options: { defaults: Inferred<T>; schemaOptions?: SchemaOptions }
): ValidationAdapter<Inferred<T>> {
	return {
		superFormValidationLibrary: 'arktype',
		process: process(schema),
		jsonSchema: toJsonSchema(options.defaults, options.schemaOptions),
		defaults: options.defaults
	};
}

export const arktype = adapter(_arktype);
