import type { InputConstraints } from '$lib/index.js';
import { defaultValues } from '$lib/jsonSchema/index.js';
import type { Schema } from '@decs/typeschema';
import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { constraints as schemaConstraints } from '$lib/jsonSchema/constraints.js';

export { zod } from './zod.js';
export { ajv } from './ajv.js';
export { valibot } from './valibot.js';

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
}

export function mapAdapter<T extends Record<string, unknown>>(
	adapter: ValidationAdapter<T>
): MappedValidationAdapter<T> {
	if (!adapterCache.has(adapter)) {
		const mapped: MappedValidationAdapter<T> = {
			...adapter,
			constraints: adapter.constraints ?? schemaConstraints(adapter.jsonSchema),
			defaults: adapter.defaults ?? defaultValues(adapter.jsonSchema)
		};
		adapterCache.set(adapter, mapped);
	}
	return adapterCache.get(adapter) as MappedValidationAdapter<T>;
}

const adapterCache = new WeakMap<
	ValidationAdapter<Record<string, unknown>>,
	MappedValidationAdapter<Record<string, unknown>>
>();
