import { type ValidationAdapter, type JsonSchemaOptions, createAdapter } from './adapters.js';
import type { ObjectSchema } from 'joi';
import { memoize } from '$lib/memoize.js';

const fetchModule = /* @__PURE__ */ memoize(async () => {
	const joiToJson = await import(/* webpackIgnore: true */ '@sinclair/typebox/compiler');
	return { joiToJson };
});

const { joiToJson } = await fetchModule();

/* @__NO_SIDE_EFFECTS__ */
function _joi<T extends ObjectSchema>(
	schema: T,
	options?: JsonSchemaOptions<T>
): ValidationAdapter<Record<string, unknown>> {
	return createAdapter({
		superFormValidationLibrary: 'joi',
		// @ts-expect-error No type information exists for joi-to-json
		jsonSchema: options?.jsonSchema ?? joiToJson(schema),
		defaults: options?.defaults,
		async validate(data) {
			const result = schema.validate(data, { abortEarly: false });
			if (result.error == null) {
				return {
					data: result.value,
					success: true
				};
			}
			return {
				issues: result.error.details.map(({ message, path }) => ({
					message,
					path
				})),
				success: false
			};
		}
	});
}

export const joi = /* @__PURE__ */ memoize(_joi);
