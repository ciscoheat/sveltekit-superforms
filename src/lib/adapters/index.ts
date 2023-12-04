import type { InputConstraints } from '$lib/index.js';
import { constraints, defaultValues } from '$lib/jsonSchema.js';
import type { Schema, validate } from '@decs/typeschema';
import type { JSONSchema7 } from 'json-schema';

export type ValidationLibrary = 'zod' | 'valibot' | 'ajv' | 'unknown';

export type ValidationAdapter<
	T extends Record<string, unknown>,
	Lib extends ValidationLibrary = ValidationLibrary
> = {
	superFormValidationLibrary: Lib;
	defaults: T;
	constraints: InputConstraints<T>;
	schema: Schema;
	jsonSchema: JSONSchema7;
	customValidator?: (data: unknown) => ReturnType<typeof validate>;
};

export function validationAdapter<T extends Record<string, unknown>, Lib extends ValidationLibrary>(
	validationLibrary: Lib,
	validator: Schema,
	cacheData: () => { jsonSchema: JSONSchema7; defaults?: T },
	cacheKeys?: object[],
	customValidator?: (data: unknown) => ReturnType<typeof validate>
): ValidationAdapter<T, Lib> {
	if (!cacheKeys) cacheKeys = [validator];

	let currentCache: WeakMap<object, object> | undefined = cacheKeys.length
		? schemaCache
		: undefined;

	while (cacheKeys.length) {
		const key = cacheKeys.shift();
		if (!key) break;
		if (!currentCache?.has(key)) {
			const nextCache = new WeakMap<object, object>();
			currentCache?.set(key, nextCache);
			currentCache = nextCache;
		} else {
			currentCache = currentCache.get(key) as WeakMap<object, object>;
		}
	}

	if (!currentCache || !currentCache.has(validator)) {
		const { jsonSchema, defaults } = cacheData();
		const adapter = {
			superFormValidationLibrary: validationLibrary,
			schema: validator,
			jsonSchema,
			defaults: defaults ?? defaultValues<T>(jsonSchema),
			constraints: constraints(jsonSchema),
			customValidator
		};

		if (!currentCache) return adapter;
		else currentCache.set(validator, adapter);
	}

	return currentCache.get(validator) as ValidationAdapter<T, Lib>;
}

const schemaCache = new WeakMap<
	object,
	object | ValidationAdapter<Record<string, unknown>, ValidationLibrary>
>();
