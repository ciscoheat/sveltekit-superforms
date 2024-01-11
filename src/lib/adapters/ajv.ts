import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { memoize } from '$lib/memoize.js';
import { createAdapter, type ValidationAdapter } from './adapters.js';
import type { Options } from 'ajv';

const fetchModule = /* @__PURE__ */ memoize(async () => {
	const { default: Ajv } = await import(/* webpackIgnore: true */ 'ajv');
	const addFormats = (await import(/* webpackIgnore: true */ 'ajv-formats')) as unknown as (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		ajv: any
	) => void;
	return { Ajv, addFormats };
});

const { Ajv, addFormats } = await /* @__PURE__ */ fetchModule();

/* @__NO_SIDE_EFFECTS__ */
function _ajv<T extends Record<string, unknown>>(
	schema: JSONSchema,
	options?: Options
): ValidationAdapter<T> {
	const ajv = new Ajv.default({ allErrors: true, ...(options || {}) });
	addFormats(ajv);
	const validator = ajv.compile(schema);

	return createAdapter({
		superFormValidationLibrary: 'ajv',
		jsonSchema: schema,
		async validate(data: unknown) {
			if (validator(data)) {
				return {
					data: data as T,
					success: true
				};
			}
			return {
				issues: (validator.errors ?? []).map(
					({ message, instancePath }: { message?: string; instancePath?: string }) => ({
						message: message ?? '',
						path: (instancePath ?? '/').slice(1).split('/')
					})
				),
				success: false
			};
		}
	});
}

export const ajv = /* @__PURE__ */ memoize(_ajv);
