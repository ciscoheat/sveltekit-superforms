import type { Inferred, InputConstraints } from '$lib/index.js';
import { constraints, defaultValues } from '$lib/jsonSchema.js';
import type { Schema } from '@decs/typeschema';
import type { JSONSchema7 } from 'json-schema';

export type ValidationLibrary = 'zod' | 'valibot' | 'defaults' | 'other';

export type ValidationAdapter<T extends Schema, Lib extends ValidationLibrary> = {
	superFormValidationLibrary: Lib;
	defaults: Inferred<T>;
	constraints: InputConstraints<Inferred<T>>;
	schema: T;
	jsonSchema: JSONSchema7;
};

export type ValidationAdapterOptions<T extends Schema> = {
	jsonSchema: JSONSchema7;
	defaults?: Inferred<T>;
};

export function baseAdapter<T extends Schema, Lib extends ValidationLibrary>(
	validationLibrary: Lib,
	schema: T,
	options: ValidationAdapterOptions<T>
): ValidationAdapter<T, Lib> {
	return {
		superFormValidationLibrary: validationLibrary,
		schema,
		jsonSchema: options.jsonSchema,
		defaults: options.defaults ?? defaultValues<Inferred<T>>(options.jsonSchema),
		constraints: constraints(options.jsonSchema)
	};
}

export function validationSchemaType(schema: Schema): ValidationLibrary {
	if ('safeParseAsync' in schema) return 'zod';
	return 'other';
}
