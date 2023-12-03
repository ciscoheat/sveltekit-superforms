import type { JSONSchema7 } from 'json-schema';
import {
	validationAdapter,
	type ValidationAdapter,
	type ValidationAdapterOptions
} from './index.js';
import toJsonSchema from 'to-json-schema';
import type { BaseSchema, BaseSchemaAsync } from 'valibot';

export function valibot<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	options: ValidationAdapterOptions<T, 'requires-defaults'>
): ValidationAdapter<T, 'valibot'> {
	return validationAdapter<T, 'valibot'>(
		'valibot',
		schema,
		toJsonSchema(options.defaults) as JSONSchema7
	);
}
