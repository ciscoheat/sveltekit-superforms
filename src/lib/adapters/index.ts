import { WeakMapCache } from '$lib/cache.js';
import type { InputConstraints } from '$lib/index.js';
import { constraints, defaultValues } from '$lib/jsonSchema.js';
import type { Schema, validate } from '@decs/typeschema';
import type { JSONSchema } from '$lib/jsonSchema.js';

// Lifted from TypeSchema, since they are not exported
type ValidationIssue = {
	message: string;
	path?: Array<string | number | symbol>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidationResult<TOutput = any> =
	| {
			success: true;
			data: TOutput;
	  }
	| {
			success: false;
			issues: Array<ValidationIssue>;
	  };

export type ValidationLibrary = 'zod' | 'valibot' | 'ajv' | 'unknown';

export interface ValidationAdapter<T extends Record<string, unknown>> {
	superFormValidationLibrary: ValidationLibrary;
	validator: () => Schema;
	jsonSchema: () => JSONSchema;
	cacheKeys?: [Schema, ...object[]];
	customValidator?: (data: unknown) => Promise<ValidationResult<T>>;
	defaults?: T;
}

export type MappedValidationAdapter<T extends Record<string, unknown>> = {
	library: ValidationLibrary;
	defaults: T;
	jsonSchema: JSONSchema;
	customValidator?: (data: unknown) => ReturnType<typeof validate>;
	validator: Schema;
	constraints: InputConstraints<T>;
};

export function mapAdapter<T extends Record<string, unknown>>(
	adapter: ValidationAdapter<T>
): MappedValidationAdapter<T> {
	const cache = schemaCache.get<MappedValidationAdapter<T>>(
		adapter.cacheKeys ?? [adapter.validator()]
	);

	if (!cache.data) {
		const jsonSchema = adapter.jsonSchema();

		const validation: MappedValidationAdapter<T> = {
			library: adapter.superFormValidationLibrary,
			defaults: adapter.defaults ?? defaultValues(jsonSchema),
			jsonSchema,
			customValidator: adapter.customValidator,
			validator: adapter.validator(),
			constraints: constraints(jsonSchema)
		};

		return cache.set(validation);
	}

	return cache.data;
}

const schemaCache = new WeakMapCache<MappedValidationAdapter<Record<string, unknown>>>();
