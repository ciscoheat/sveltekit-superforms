import {
	toJsonSchema,
	type ValidationAdapter,
	type AdapterDefaultOptions,
	type RequiredJsonSchemaOptions,
	createAdapter
} from './adapters.js';
import { safeParseAsync, type BaseSchema, type BaseSchemaAsync } from 'valibot';
import type { Infer } from '$lib/index.js';
import { memoize } from '$lib/memoize.js';

/* @__NO_SIDE_EFFECTS__ */
function _valibot<T extends BaseSchema | BaseSchemaAsync>(
	schema: T,
	options: AdapterDefaultOptions<T> | RequiredJsonSchemaOptions<T>
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'valibot',
		async validate(data) {
			const result = await safeParseAsync(schema, data);
			if (result.success) {
				return {
					data: result.output as Infer<T>,
					success: true
				};
			}
			return {
				issues: result.issues.map(({ message, path }) => ({
					message,
					path: path?.map(({ key }) => key) as string[]
				})),
				success: false
			};
		},
		jsonSchema:
			'jsonSchema' in options
				? options.jsonSchema
				: toJsonSchema(options.defaults, options.schemaOptions),
		defaults: options.defaults
	});
}

export const valibot = /* @__PURE__ */ memoize(_valibot);
