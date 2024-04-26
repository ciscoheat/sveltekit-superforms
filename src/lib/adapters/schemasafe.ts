import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { memoize } from '$lib/memoize.js';
import { createAdapter, type AdapterOptions, type ValidationAdapter, type ValidationResult } from './adapters.js';
import { validator, type Json, type Schema } from '@exodus/schemasafe';

const Email =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

function _schemasafe<T extends Schema>(
  schema: Schema,
  options?: AdapterOptions<T>
): ValidationAdapter<Record<string, unknown>> {
  return createAdapter({
    superFormValidationLibrary: 'schemasafe',
    jsonSchema: schema as JSONSchema,
    defaults: options?.defaults,
    async validate(data: unknown): Promise<ValidationResult<Record<string, unknown>>> {
      
      const _validate = validator(schema, {
        formats: {
          'email': (str) => Email.test(str)
        },
        includeErrors: true,
        allErrors: true,
      });

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