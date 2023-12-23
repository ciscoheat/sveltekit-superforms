import { SuperFormError, type InputConstraints } from '$lib/index.js';
import type { Schema as TypeSchema, ValidationIssue } from '@decs/typeschema';
import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { constraints as schemaConstraints } from '$lib/jsonSchema/constraints.js';
import { defaultValues } from '$lib/jsonSchema/defaultValues.js';
import { objectShape, type SchemaShape } from '$lib/jsonSchema/schemaShape.js';

export { memoize as adapter } from '$lib/memoize.js';

import toSchema from 'to-json-schema';
import type { Options as SchemaOptions } from 'to-json-schema';
import { schemaHash } from '$lib/jsonSchema/schemaHash.js';
export type { Options as SchemaOptions } from 'to-json-schema';

export { zod } from './zod.js';
export { ajv } from './ajv.js';
export { valibot } from './valibot.js';
export { arktype } from './arktype.js';

export type ValidationLibrary = 'zod' | 'valibot' | 'ajv' | 'arktype' | 'typebox' | 'custom';

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

export interface ValidationAdapter<T extends Record<string, unknown>> {
	superFormValidationLibrary: ValidationLibrary;
	validator?: Schema;
	jsonSchema: JSONSchema;
	process?: (data: unknown) => Promise<ValidationResult<T>>;
	postProcess?: (result: ValidationResult<Record<string, unknown>>) => Promise<ValidationResult<T>>;
	defaults?: T;
	constraints?: InputConstraints<T>;
}

export interface MappedValidationAdapter<T extends Record<string, unknown>>
	extends ValidationAdapter<T> {
	defaults: T;
	constraints: InputConstraints<T>;
	shape: SchemaShape;
	id: string;
}

export function mapAdapter<T extends Record<string, unknown>>(
	adapter: ValidationAdapter<T>
): MappedValidationAdapter<T> {
	if (!adapterCache.has(adapter)) {
		const jsonSchema = adapter.jsonSchema;
		const mapped = {
			...adapter,
			constraints: adapter.constraints ?? schemaConstraints(jsonSchema),
			defaults: adapter.defaults ?? defaultValues(jsonSchema),
			shape: objectShape(jsonSchema),
			id: schemaHash(jsonSchema)
		} satisfies MappedValidationAdapter<T>;

		adapterCache.set(adapter, mapped);
	}
	return adapterCache.get(adapter) as MappedValidationAdapter<T>;
}

export const toJsonSchema = (value: Record<string, unknown>, options?: SchemaOptions) => {
	options = {
		objects: { additionalProperties: false, ...(options?.objects ?? {}) },
		...(options ?? {})
	};
	return toSchema(value, options) as JSONSchema;
};

const adapterCache = new WeakMap<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ValidationAdapter<any>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	MappedValidationAdapter<any>
>();
