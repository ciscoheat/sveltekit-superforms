import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { constraints as schemaConstraints } from '$lib/jsonSchema/constraints.js';
import { defaultValues } from '$lib/jsonSchema/schemaDefaults.js';
import { schemaShape, type SchemaShape } from '$lib/jsonSchema/schemaShape.js';
import { schemaHash } from '$lib/jsonSchema/schemaHash.js';
import type { Options as SchemaOptions } from './to-json-schema/types.js';
import type { InputConstraints } from '$lib/jsonSchema/constraints.js';
import { SuperFormError } from '$lib/errors.js';
import type {
	Schema,
	ValidationResult,
	Infer as InferSchema,
	InferIn as InferInSchema
} from './typeSchema.js';

export type { Schema, ValidationIssue, ValidationResult } from './typeSchema.js';

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
