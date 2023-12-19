import type { Type } from 'arktype';
import type { ValidationAdapter } from './index.js';
import toJsonSchema from 'to-json-schema';
import type { Inferred } from '$lib/index.js';
import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { memoize } from '$lib/memoize.js';

function _arktype<T extends Type>(
	schema: T,
	options: { defaults: Inferred<T> }
): ValidationAdapter<Inferred<T>> {
	return {
		superFormValidationLibrary: 'arktype',
		validator: schema,
		jsonSchema: toJsonSchema(options.defaults) as JSONSchema,
		defaults: options.defaults
	};
}

export const arktype = memoize(_arktype);
