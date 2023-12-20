import type { InputConstraints } from '$lib/index.js';
import type { Schema, ValidationIssue } from '@decs/typeschema';
import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { constraints as schemaConstraints } from '$lib/jsonSchema/constraints.js';
import { defaultValues } from '$lib/jsonSchema/defaultValues.js';
import { objectShape, type ObjectShape } from '$lib/jsonSchema/objectShape.js';

export { memoize as adapter } from '$lib/memoize.js';

import toSchema from 'to-json-schema';
import type { Options as SchemaOptions } from 'to-json-schema';
import { schemaHash } from '$lib/jsonSchema/schemaHash.js';
export type { Options as SchemaOptions } from 'to-json-schema';

export { zod } from './zod.js';
export { ajv } from './ajv.js';
export { valibot } from './valibot.js';
export { arktype } from './arktype.js';

export type ValidationLibrary = 'zod' | 'valibot' | 'ajv' | 'arktype' | 'unknown';

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

export interface ValidationAdapter<T extends Record<string, unknown>> {
	superFormValidationLibrary: ValidationLibrary;
	validator: Schema;
	jsonSchema: JSONSchema;
	customValidator?: (data: unknown) => Promise<ValidationResult<T>>;
	defaults?: T;
	constraints?: InputConstraints<T>;
}

export interface MappedValidationAdapter<T extends Record<string, unknown>>
	extends ValidationAdapter<T> {
	defaults: T;
	constraints: InputConstraints<T>;
	shape: ObjectShape;
	id: string;
}

export function mapAdapter<T extends Record<string, unknown>>(
	adapter: ValidationAdapter<T>
): MappedValidationAdapter<T> {
	if (!adapterCache.has(adapter)) {
		const jsonSchema = adapter.jsonSchema;
		const mapped: MappedValidationAdapter<T> = {
			...adapter,
			constraints: adapter.constraints ?? schemaConstraints(jsonSchema),
			defaults: adapter.defaults ?? defaultValues(jsonSchema),
			shape: objectShape(jsonSchema),
			id: schemaHash(jsonSchema)
		};
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
	ValidationAdapter<Record<string, unknown>>,
	MappedValidationAdapter<Record<string, unknown>>
>();
