import type { JSONSchema } from '$lib/jsonSchema/index.js';
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

const Email =
	/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

type SchemasafeSchema = Exclude<Schema, boolean>;

function _schemasafe<T extends SchemasafeSchema>(
	schema: T,
	options?: AdapterOptions<T> & { config?: ValidatorOptions }
): ValidationAdapter<Record<string, unknown>> {
	return createAdapter({
		superFormValidationLibrary: 'schemasafe',
		jsonSchema: schema as JSONSchema,
		defaults: options?.defaults,
		async validate(data: unknown): Promise<ValidationResult<Record<string, unknown>>> {
			if (!cache.has(schema)) {
				cache.set(
					schema,
					validator(schema, {
						formats: {
							email: (str) => Email.test(str)
						},
						includeErrors: true,
						allErrors: true,
						...options?.config
					})
				);
			}

			const _validate = cache.get(schema)!;

			const isValid = _validate(data as Json);

			if (isValid) {
				return {
					data: data as Record<string, unknown>,
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

const cache = new WeakMap<SchemasafeSchema, Validate>();
