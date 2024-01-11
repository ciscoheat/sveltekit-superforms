import type { Type } from 'arktype';
import {
	toJsonSchema,
	type ValidationAdapter,
	type AdapterDefaultOptions,
	type RequiredJsonSchemaOptions,
	type Infer,
	createAdapter
} from './adapters.js';
import { memoize } from '$lib/memoize.js';

function _arktype<T extends Type>(
	schema: T,
	options: AdapterDefaultOptions<T> | RequiredJsonSchemaOptions<T>
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'arktype',
		defaults: options.defaults,
		jsonSchema:
			'jsonSchema' in options
				? options.jsonSchema
				: toJsonSchema(options.defaults, options.schemaOptions),
		async validate(data) {
			const result = schema(data);
			if (result.problems == null) {
				return {
					data: result.data as Infer<T>,
					success: true
				};
			}
			return {
				issues: Array.from(result.problems).map(({ message, path }) => ({
					message,
					path
				})),
				success: false
			};
		}
	});
}

export const arktype = /* @__PURE__ */ memoize(_arktype);
