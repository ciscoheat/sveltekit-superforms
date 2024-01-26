import type { AnySchema } from 'yup';
import type { JSONSchema7 } from 'json-schema';
import type { Converters, ResolveOptions } from '../types.js';
import stringConverter from './string.js';
import numberConverter from './number.js';
import booleanConverter from './boolean.js';
import dateConverter from './date.js';
import arrayConverter from './array.js';
import objectConverter from './object.js';
import tupleConverter from './tuple.js';
import mixedConverter from './mixed.js';
import lazyConverter from './lazy.js';

export function convertSchema(yupSchema: AnySchema, options?: ResolveOptions): JSONSchema7 {
	const { converters, ...resolveOptions } = options || {};

	const allConverters: Converters = {
		string: stringConverter,
		number: numberConverter,
		boolean: booleanConverter,
		date: dateConverter,
		array: arrayConverter,
		object: objectConverter,
		tuple: tupleConverter,
		mixed: mixedConverter,
		lazy: lazyConverter,
		...converters
	};

	const description = yupSchema.describe(resolveOptions);
	const converter = allConverters[description.type as keyof Converters];

	return converter(description, allConverters);
}
