import type { Type } from 'arktype';
import {
	toJsonSchema,
	type ValidationAdapter,
	validate,
	type AdapterDefaultOptions,
	type RequiredJsonSchemaOptions,
	createAdapter
} from './adapters.js';
import type { Inferred } from '$lib/index.js';
import { memoize } from '$lib/memoize.js';

function _arktype<T extends Type>(
	schema: T,
	options: AdapterDefaultOptions<T> | RequiredJsonSchemaOptions<T>
): ValidationAdapter<Inferred<T>> {
	return createAdapter({
		superFormValidationLibrary: 'arktype',
		validate: validate(schema),
		jsonSchema:
			'jsonSchema' in options
				? options.jsonSchema
				: toJsonSchema(options.defaults, options.schemaOptions),
		defaults: options.defaults
	});
}

export const arktype = memoize(_arktype);
