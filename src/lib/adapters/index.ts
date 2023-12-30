import { SuperFormError, type InputConstraints } from '$lib/index.js';
import { validate, type Schema as TypeSchema, type ValidationIssue } from '@decs/typeschema';
import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { constraints as schemaConstraints } from '$lib/jsonSchema/constraints.js';
import { defaultValues } from '$lib/jsonSchema/defaultValues.js';
import { schemaShape, type SchemaShape } from '$lib/jsonSchema/schemaShape.js';
import toSchema from 'to-json-schema';
import { schemaHash } from '$lib/jsonSchema/schemaHash.js';
import type { Options as SchemaOptions } from 'to-json-schema';

// Must be exported before the adapters:
export { memoize as adapter } from '$lib/memoize.js';

export { ajv } from './ajv.js';
export { arktype } from './arktype.js';
export { joi } from './joi.js';
export { superform } from './superform.js';
export { typebox } from './typebox.js';
export { valibot } from './valibot.js';
export { zod } from './zod.js';

export type { Options as SchemaOptions } from 'to-json-schema';

export type ValidationLibrary =
	| 'zod'
	| 'valibot'
	| 'ajv'
	| 'arktype'
	| 'typebox'
	| 'joi'
	| 'superform'
	| 'custom';

// Lifted from TypeSchema, since they are not exported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValidationResult<TOutput = any> =
	| {
			success: true;
			data: TOutput;
	  }
	| {
			success: false;
			issues: Array<ValidationIssue>;
	  };

export type Schema = TypeSchema;

export type ValidationAdapter<T extends Record<string, unknown>> = {
	superFormValidationLibrary: ValidationLibrary;
	jsonSchema: JSONSchema;
	process: (data: unknown) => Promise<ValidationResult<T>>;
	defaults?: T;
	constraints?: InputConstraints<T>;
};

export type MappedValidationAdapter<T extends Record<string, unknown>> = ValidationAdapter<T> & {
	defaults: T;
	constraints: InputConstraints<T>;
	shape: SchemaShape;
	id: string;
};

export function process<T extends Record<string, unknown>>(schema: TypeSchema) {
	return async (data: unknown) => (await validate(schema, data)) as ValidationResult<T>;
}

export function mapAdapter<T extends Record<string, unknown>>(
	adapter: ValidationAdapter<T>,
	jsonSchema?: JSONSchema
): MappedValidationAdapter<T> {
	if (!adapterCache.has(adapter)) {
		if (!adapter || !('superFormValidationLibrary' in adapter)) {
			throw new SuperFormError(
				'Superforms v2 requires a validation adapter for the schema. ' +
					'Import one of your choice from "sveltekit-superforms/adapters" and wrap the schema with it.'
			);
		}

		if (!jsonSchema) jsonSchema = adapter.jsonSchema;

		const mapped = {
			...adapter,
			constraints: adapter.constraints ?? schemaConstraints(jsonSchema),
			defaults: adapter.defaults ?? defaultValues(jsonSchema),
			shape: schemaShape(jsonSchema),
			id: schemaHash(jsonSchema)
		} satisfies MappedValidationAdapter<T>;

		adapterCache.set(adapter, mapped);
	}
	return adapterCache.get(adapter) as MappedValidationAdapter<T>;
}

/**
 * Version of to-json-schema that checks if the object properties are default
 * (empty string, 0, empty array, etc) and sets the required property if not.
 * Also sets additionalProperties to false.
 * @param object object that should be converted to JSON Schema
 * @param options customize schema options
 * @returns JSON Schema for the object
 * @see https://www.npmjs.com/package/to-json-schema
 */
export const toJsonSchema = (object: Record<string, unknown>, options?: SchemaOptions) => {
	options = {
		postProcessFnc(type, schema, value, defaultFunc) {
			if (schema.properties && options?.required !== false) {
				schema.required = Object.keys(value).filter((prop) => {
					if (options?.required === true) return true;
					const hasValue = value[prop] && (!Array.isArray(value[prop]) || value[prop].length > 0);
					// If no value, it probably doesn't have a default value and should be required
					return !hasValue;
				});
				if (schema.required.length == 0) delete schema.required;
				return schema;
			}
			return defaultFunc(type, schema, value);
		},
		objects: { additionalProperties: false, ...(options?.objects ?? {}) },
		...(options ?? {})
	};
	return toSchema(object, options) as JSONSchema;
};

const adapterCache = new WeakMap<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ValidationAdapter<any>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	MappedValidationAdapter<any>
>();
