import { SuperFormError, type InputConstraints, type Inferred } from '$lib/index.js';
import {
	validate as typeSchemaValidate,
	type Schema as TypeSchema,
	type ValidationIssue
} from '@decs/typeschema';
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
export { yup } from './yup.js';
export { zod } from './zod.js';

export type { Options as SchemaOptions } from 'to-json-schema';

export type ValidationLibrary =
	| 'ajv'
	| 'arktype'
	| 'custom'
	| 'joi'
	| 'superform'
	| 'typebox'
	| 'valibot'
	| 'yup'
	| 'zod';

export type Schema = TypeSchema;

export type AdapterDefaultOptions<T extends Schema> = {
	defaults: Inferred<T>;
	schemaOptions?: SchemaOptions;
};

export type JsonSchemaOptions<T extends Schema> = {
	jsonSchema?: JSONSchema;
	defaults?: Inferred<T>;
};

export type RequiredJsonSchemaOptions<T extends Schema> = {
	jsonSchema: JSONSchema;
	defaults?: Inferred<T>;
};

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

export type BaseValidationAdapter<T extends Record<string, unknown>> = {
	superFormValidationLibrary: ValidationLibrary;
	jsonSchema: JSONSchema;
	validate: (data: unknown) => Promise<ValidationResult<T>>;
	defaults?: T;
	constraints?: InputConstraints<T>;
};

export type ValidationAdapter<T extends Record<string, unknown>> = BaseValidationAdapter<T> & {
	defaults: T;
	constraints: InputConstraints<T>;
	shape: SchemaShape;
	id: string;
};

export function validate<T extends Record<string, unknown>>(schema: TypeSchema) {
	return async (data: unknown) => (await typeSchemaValidate(schema, data)) as ValidationResult<T>;
}

export function createAdapter<T extends Record<string, unknown>>(
	adapter: BaseValidationAdapter<T>,
	jsonSchema?: JSONSchema
): ValidationAdapter<T> {
	if (!adapter || !('superFormValidationLibrary' in adapter)) {
		throw new SuperFormError(
			'Superforms v2 requires a validation adapter for the schema. ' +
				'Import one of your choice from "sveltekit-superforms/adapters" and wrap the schema with it.'
		);
	}

	if (!jsonSchema) jsonSchema = adapter.jsonSchema;

	return {
		...adapter,
		constraints: adapter.constraints ?? schemaConstraints(jsonSchema),
		defaults: adapter.defaults ?? defaultValues(jsonSchema),
		shape: schemaShape(jsonSchema),
		id: schemaHash(jsonSchema)
	};
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

/*
const adapterCache = new WeakMap<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	BaseValidationAdapter<any>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ValidationAdapter<any>
>();
*/
