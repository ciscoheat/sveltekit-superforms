import type {
	Schema as TypeSchema,
	Infer as InferSchema,
	InferIn as InferInSchema
} from '@decs/typeschema';
import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { constraints as schemaConstraints } from '$lib/jsonSchema/constraints.js';
import { defaultValues } from '$lib/jsonSchema/schemaDefaults.js';
import { schemaShape, type SchemaShape } from '$lib/jsonSchema/schemaShape.js';
import toSchema from 'to-json-schema';
import { schemaHash } from '$lib/jsonSchema/schemaHash.js';
import type { Options as SchemaOptions } from 'to-json-schema';
import type { InputConstraints } from '$lib/jsonSchema/constraints.js';
import { SuperFormError } from '$lib/errors.js';

export type { Options as SchemaOptions } from 'to-json-schema';

export type Schema = TypeSchema;
export type Infer<T extends Schema> = NonNullable<InferSchema<T>>;
export type InferIn<T extends Schema> = NonNullable<InferInSchema<T>>;

export type ValidationLibrary =
	//| 'ajv'
	| 'arktype'
	| 'custom'
	| 'joi'
	| 'superform'
	//| 'superstruct'
	| 'typebox'
	| 'valibot'
	| 'yup'
	| 'zod';

export type AdapterDefaultOptions<T extends Schema> = {
	defaults: Infer<T>;
	schemaOptions?: SchemaOptions;
};

export type JsonSchemaOptions<T extends Schema> = {
	jsonSchema?: JSONSchema;
	defaults?: Infer<T>;
};

export type RequiredJsonSchemaOptions<T extends Schema> = {
	jsonSchema: JSONSchema;
	defaults?: Infer<T>;
};

// Lifted from TypeSchema
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

// Lifted from TypeSchema
export type ValidationIssue = {
	message: string;
	path?: Array<string | number | symbol>;
};

export type ClientValidationAdapter<Out extends Record<string, unknown>> = {
	superFormValidationLibrary: ValidationLibrary;
	validate: (data: unknown) => Promise<ValidationResult<Out>>;
	shape?: SchemaShape;
};

type BaseValidationAdapter<Out extends Record<string, unknown>> = ClientValidationAdapter<Out> & {
	jsonSchema: JSONSchema;
	defaults?: Out;
	constraints?: InputConstraints<Out>;
};

export type ValidationAdapter<Out extends Record<string, unknown>> = BaseValidationAdapter<Out> & {
	defaults: Out;
	constraints: InputConstraints<Out>;
	shape: SchemaShape;
	id: string;
};

/* @__NO_SIDE_EFFECTS__ */
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
 * Also sets additionalProperties to false, and sets undefined or null values on an object to "any".
 * @param object object that should be converted to JSON Schema
 * @param options customize schema options
 * @returns JSON Schema for the object
 * @see https://www.npmjs.com/package/to-json-schema
 * @__NO_SIDE_EFFECTS__
 */
export const toJsonSchema = (object: Record<string, unknown>, options?: SchemaOptions) => {
	options = {
		postProcessFnc(type, schema, value, defaultFunc) {
			if (schema.properties && options?.required !== false) {
				schema.required = Object.keys(value).filter((prop) => {
					if (options?.required === true) return true;
					const hasValue = value[prop] && (!Array.isArray(value[prop]) || value[prop].length > 0);
					// If no value, it probably doesn't have a default value and should be required
					return !hasValue && value[prop] !== undefined && value[prop] !== null;
				});
				if (schema.required.length == 0) delete schema.required;
				return schema;
			}
			return defaultFunc(type, schema, value);
		},
		objects: {
			additionalProperties: false,
			preProcessFnc(obj, defaultFunc) {
				if (obj && typeof obj == 'object') {
					const unknownKeys: string[] = [];
					for (const [key, value] of Object.entries(obj)) {
						if (value !== undefined && value !== null) continue;
						unknownKeys.push(key);
					}

					if (unknownKeys.length) {
						obj = { ...obj };
						for (const key of unknownKeys) {
							delete obj[key];
						}

						const output = defaultFunc(obj);
						if (!output.properties) output.properties = {};
						for (const key of unknownKeys) {
							output.properties[key] = {};
						}

						return output;
					}
				}
				return defaultFunc(obj);
			},
			...(options?.objects ?? {})
		},
		...(options ?? {})
	};
	return /* @__PURE__ */ toSchema(object, options) as JSONSchema;
};
