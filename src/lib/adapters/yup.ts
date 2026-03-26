import {
	type AdapterOptions,
	type ValidationAdapter,
	type Infer,
	type InferIn,
	createAdapter,
	type ValidationResult,
	type ClientValidationAdapter
} from './adapters.js';
import type { AnySchema, Schema } from 'yup';
import { splitPath } from '$lib/stringPath.js';
import { memoize } from '$lib/memoize.js';
import { convertSchema } from './yup-to-json-schema/index.js';

const modules = async () => {
	const { ValidationError } = await import(/* webpackIgnore: true */ 'yup');
	return { ValidationError };
};

const fetchModule = /* @__PURE__ */ memoize(modules);

/* @__NO_SIDE_EFFECTS__ */
export function yupToJSONSchema(schema: AnySchema) {
	return convertSchema(schema, {
		converters: {
			date: (desc, options) => {
				return options.string(desc, options);
			}
		}
	});
}

async function validate<T extends Schema>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T, 'yup'>>> {
	const { ValidationError } = await fetchModule();
	try {
		return {
			success: true,
			data: await schema.validate(data, { strict: true, abortEarly: false })
		};
	} catch (error) {
		if (!(error instanceof ValidationError)) throw error;

		return {
			success: false,
			issues: error.inner.map((error) => ({
				message: error.message,
				path: error.path !== null && error.path !== undefined ? splitPath(error.path) : undefined
			}))
		};
	}
}

/* @__NO_SIDE_EFFECTS__ */
function _yup<T extends Schema>(
	schema: T,
	options?: AdapterOptions<Infer<T, 'yup'>>
): ValidationAdapter<Infer<T, 'yup'>, InferIn<T, 'yup'>> {
	return createAdapter({
		superFormValidationLibrary: 'yup',
		validate: async (data: unknown) => validate(schema, data),
		jsonSchema: options?.jsonSchema ?? yupToJSONSchema(schema),
		defaults: options?.defaults
	});
}

function _yupClient<T extends Schema>(
	schema: T
): ClientValidationAdapter<Infer<T, 'yup'>, InferIn<T, 'yup'>> {
	return {
		superFormValidationLibrary: 'yup',
		validate: async (data) => validate(schema, data)
	};
}

export const yup = /* @__PURE__ */ memoize(_yup);
export const yupClient = /* @__PURE__ */ memoize(_yupClient);
