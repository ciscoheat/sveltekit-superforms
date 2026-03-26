import { memoize } from '$lib/memoize.js';
import {
	createAdapter,
	type AdapterOptions,
	type ClientValidationAdapter,
	type ValidationAdapter
} from './adapters.js';
import type { Json, Schema, Validate, ValidatorOptions } from '@exodus/schemasafe';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import type { JSONSchema as JSONSchema7 } from '$lib/jsonSchema/index.js';
import { pathExists } from '$lib/traversal.js';

async function modules() {
	const { validator } = await import(/* webpackIgnore: true */ '@exodus/schemasafe');
	return { validator };
}

const fetchModule = /* @__PURE__ */ memoize(modules);

/*
 * Adapter specificts:
 * Type inference problem unless this is applied:
 * https://github.com/ThomasAribart/json-schema-to-ts/blob/main/documentation/FAQs/applying-from-schema-on-generics.md
 * Must duplicate validate method, otherwise the above type inference will fail.
 */

const Email =
	/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

const defaultOptions = {
	formats: {
		email: (str: string) => Email.test(str)
	},
	includeErrors: true,
	allErrors: true
};

async function cachedValidator(currentSchema: JSONSchema7, config?: ValidatorOptions) {
	const { validator } = await fetchModule();

	if (!cache.has(currentSchema)) {
		cache.set(
			currentSchema,
			validator(currentSchema as Schema, {
				...defaultOptions,
				...config
			})
		);
	}

	return cache.get(currentSchema)!;
}

function _schemasafe<
	T extends JSONSchema | Record<string, unknown>,
	Data = unknown extends FromSchema<T> ? Record<string, unknown> : FromSchema<T>,
	Out = [Data] extends [never] ? Record<string, unknown> : Data
>(
	schema: T,
	options?: AdapterOptions<Out> & { descriptionAsErrors?: boolean; config?: ValidatorOptions }
): ValidationAdapter<Out> {
	return createAdapter({
		superFormValidationLibrary: 'schemasafe',
		jsonSchema: schema as JSONSchema7,
		defaults: options?.defaults,
		async validate(data: unknown) {
			const validator = await cachedValidator(schema as JSONSchema7, options?.config);
			const isValid = validator(data as Json);

			if (isValid) {
				return {
					data: data as Out,
					success: true
				};
			}
			return {
				issues: (validator.errors ?? []).map(({ instanceLocation, keywordLocation }) => ({
					message: options?.descriptionAsErrors
						? errorDescription(schema as Record<string, unknown>, keywordLocation)
						: keywordLocation,
					path: instanceLocation.split('/').slice(1)
				})),
				success: false
			};
		}
	});
}

function _schemasafeClient<
	T extends JSONSchema | Record<string, unknown>,
	Data = unknown extends FromSchema<T> ? Record<string, unknown> : FromSchema<T>,
	Out = [Data] extends [never] ? Record<string, unknown> : Data
>(
	schema: T,
	options?: AdapterOptions<Out> & { config?: ValidatorOptions }
): ClientValidationAdapter<Out> {
	return {
		superFormValidationLibrary: 'schemasafe',
		async validate(data: unknown) {
			const validator = await cachedValidator(schema as JSONSchema7, options?.config);
			const isValid = validator(data as Json);

			if (isValid) {
				return {
					data: data as Out,
					success: true
				};
			}
			return {
				issues: (validator.errors ?? []).map(({ instanceLocation, keywordLocation }) => ({
					message: keywordLocation,
					path: instanceLocation.split('/').slice(1)
				})),
				success: false
			};
		}
	};
}

export const schemasafe = /* @__PURE__ */ memoize(_schemasafe);
export const schemasafeClient = /* @__PURE__ */ memoize(_schemasafeClient);

const cache = new WeakMap<JSONSchema7, Validate>();

function errorDescription(schema: Record<string, unknown>, keywordLocation: string) {
	if (!keywordLocation.startsWith('#/')) return keywordLocation;
	const searchPath = keywordLocation.slice(2).split('/');
	const path = pathExists(schema, searchPath);
	return path?.parent.description ?? keywordLocation;
}
