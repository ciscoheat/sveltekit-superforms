import {
	type JsonSchemaOptions,
	type ValidationAdapter,
	type Infer,
	createAdapter,
	type ValidationResult,
	type ClientValidationAdapter
} from './adapters.js';
import type { AnySchema, Schema } from 'yup';
import { splitPath } from '$lib/stringPath.js';
import { memoize } from '$lib/memoize.js';
import { convertSchema } from '@sodaru/yup-to-json-schema';

const fetchModule = /* @__PURE__ */ memoize(async () => {
	const { ValidationError } = await import(/* webpackIgnore: true */ 'yup');
	return { ValidationError };
});

/* @__NO_SIDE_EFFECTS__ */
const yupToJsonSchema = (schema: AnySchema) => {
	return convertSchema(schema, {
		//@ts-expect-error Incorrect type information, Converters can be partial.
		converters: {
			// options.string must return type 'date'. Otherwise, set it manually.
			date: (desc, options) => options.string(desc, options)
		}
	});
};

async function validate<T extends Schema>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
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
	options?: JsonSchemaOptions<Infer<T>>
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'yup',
		validate: async (data: unknown) => validate(schema, data),
		jsonSchema: options?.jsonSchema ?? yupToJsonSchema(schema),
		defaults: options?.defaults
	});
}

function _yupClient<T extends Schema>(schema: T): ClientValidationAdapter<Infer<T>> {
	return {
		superFormValidationLibrary: 'yup',
		validate: async (data) => validate(schema, data)
	};
}

export const yup = /* @__PURE__ */ memoize(_yup);
export const yupClient = /* @__PURE__ */ memoize(_yupClient);
