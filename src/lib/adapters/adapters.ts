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
	InferIn as InferInSchema,
	Registry
} from './typeSchema.js';
import { simpleSchema } from './simple-schema/index.js';

export type { Schema, ValidationIssue, ValidationResult } from './typeSchema.js';

export type Infer<T extends Schema, K extends keyof Registry = keyof Registry> = NonNullable<InferSchema<T, K>>;
export type InferIn<T extends Schema, K extends keyof Registry = keyof Registry> = NonNullable<InferInSchema<T, K>>;

export type ValidationLibrary =
	| 'arktype'
	| 'classvalidator'
	| 'custom'
	| 'joi'
	| 'superform'
	| 'typebox'
	| 'valibot'
	| 'yup'
	| 'zod'
	| 'vine'
	| 'schemasafe'
	| 'superstruct'
	| 'effect';

export type AdapterOptions<T> = {
	jsonSchema?: JSONSchema;
	defaults?: T;
};

export type RequiredDefaultsOptions<T> = {
	defaults: T;
	jsonSchema?: JSONSchema;
};

export type ClientValidationAdapter<
	Out,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	In = Out
> = {
	superFormValidationLibrary: ValidationLibrary;
	validate: (data: unknown) => Promise<ValidationResult<Out>>;
	shape?: SchemaShape;
};

type BaseValidationAdapter<Out, In = Out> = ClientValidationAdapter<Out, In> & {
	jsonSchema: JSONSchema;
	defaults?: Out;
	constraints?: InputConstraints<Out>;
};

export type ValidationAdapter<Out, In = Out> = BaseValidationAdapter<Out, In> & {
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
export function createJsonSchema(options: object, transformer?: () => JSONSchema) {
	return 'jsonSchema' in options && options.jsonSchema
		? options.jsonSchema
		: !transformer && 'defaults' in options && options.defaults
			? simpleSchema(options.defaults)
			: transformer
				? /* @__PURE__ */ transformer()
				: () => {
						throw new SuperFormError('The "defaults" option is required for this adapter.');
					};
}

/* @__NO_SIDE_EFFECTS__ */
export function createAdapter<Out, In>(
	adapter: BaseValidationAdapter<Out, In>,
	jsonSchema?: JSONSchema
): ValidationAdapter<Out, In> {
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
