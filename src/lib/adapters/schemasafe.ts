import { memoize } from '$lib/memoize.js';
import {
	createAdapter,
	type AdapterOptions,
	type ValidationAdapter,
	type ValidationResult
} from './adapters.js';
import {
	validator,
	type Json,
	type Schema,
	type Validate,
	type ValidatorOptions
} from '@exodus/schemasafe';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import type { JSONSchema as JSONSchema7 } from '$lib/jsonSchema/index.js';

const Email =
	/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

// Type inference problem unless this is applied: https://github.com/ThomasAribart/json-schema-to-ts/blob/main/documentation/FAQs/applying-from-schema-on-generics.md

function _schemasafe<
	T extends JSONSchema | Record<string, unknown>,
	Data = unknown extends FromSchema<T> ? Record<string, unknown> : FromSchema<T>
>(
	schema: T,
	options?: AdapterOptions<Data> & { config?: ValidatorOptions }
): ValidationAdapter<Data> {
	return createAdapter({
		superFormValidationLibrary: 'schemasafe',
		jsonSchema: schema as JSONSchema7,
		defaults: options?.defaults,
		async validate(data: unknown): Promise<ValidationResult<Data>> {
			const currentSchema = schema as JSONSchema7;

			if (!cache.has(currentSchema)) {
				cache.set(
					currentSchema,
					validator(currentSchema as Schema, {
						formats: {
							email: (str) => Email.test(str)
						},
						includeErrors: true,
						allErrors: true,
						...options?.config
					})
				);
			}

			const _validate = cache.get(currentSchema)!;

			const isValid = _validate(data as Json);

			if (isValid) {
				return {
					data: data as Data,
					success: true
				};
			}
			return {
				issues: (_validate.errors ?? []).map(({ instanceLocation, keywordLocation }) => ({
					message: keywordLocation,
					path: instanceLocation.split('/').slice(1)
				})),
				success: false
			};
		}
	});
}

export const schemasafe = /* @__PURE__ */ memoize(_schemasafe);

const cache = new WeakMap<JSONSchema7, Validate>();
