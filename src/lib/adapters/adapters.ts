import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { constraints as schemaConstraints } from '$lib/jsonSchema/constraints.js';
import { defaultValues } from '$lib/jsonSchema/schemaDefaults.js';
import { schemaShape, type SchemaShape } from '$lib/jsonSchema/schemaShape.js';
import { schemaHash } from '$lib/jsonSchema/schemaHash.js';
import type { InputConstraints } from '$lib/jsonSchema/constraints.js';
import { SuperFormError } from '$lib/errors.js';
import type {
	Schema,
	ValidationResult,
	Infer as InferSchema,
	InferIn as InferInSchema
} from './typeSchema.js';
import { simpleSchema } from './simple-schema/index.js';

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

export type AdapterOptions<T extends Schema> = {
	jsonSchema?: JSONSchema;
	defaults?: Infer<T>;
};

export type RequiredDefaultsOptions<T extends Schema> = {
	defaults: Infer<T>;
	jsonSchema?: JSONSchema;
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

/**
 * If the adapter options doesn't have a "defaults" or "jsonSchema" fields,
 * this is a convenient function for creating a JSON schema.
 * If no transformer exist for the adapter, use RequiredDefaultsOptions.
 * @see {AdapterOptions}
 * @see {RequiredDefaultsOptions}
 * @__NO_SIDE_EFFECTS__
 */
export function createJsonSchema(options: Record<string, unknown>, transformer?: () => JSONSchema) {
	return 'jsonSchema' in options && options.jsonSchema
		? options.jsonSchema
		: 'defaults' in options && options.defaults
			? simpleSchema(options.defaults)
			: transformer
				? /* @__PURE__ */ transformer()
				: () => {
						throw new SuperFormError('The "defaults" option is required for this adapter.');
					};
}

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
