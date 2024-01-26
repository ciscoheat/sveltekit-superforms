import type { Type } from 'arktype';
import {
	type ValidationAdapter,
	type AdapterDefaultOptions,
	type RequiredJsonSchemaOptions,
	type Infer,
	createAdapter,
	type ClientValidationAdapter,
	type ValidationResult
} from './adapters.js';
import { memoize } from '$lib/memoize.js';
import { simpleSchema } from './simple-schema/index.js';

async function validate<T extends Type>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
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

function _arktype<T extends Type>(
	schema: T,
	options: AdapterDefaultOptions<T> | RequiredJsonSchemaOptions<T>
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'arktype',
		defaults: options.defaults,
		jsonSchema: 'jsonSchema' in options ? options.jsonSchema : simpleSchema(options.defaults),
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

function _arktypeClient<T extends Type>(schema: T): ClientValidationAdapter<Infer<T>> {
	return {
		superFormValidationLibrary: 'arktype',
		validate: async (data) => validate(schema, data)
	};
}

export const arktype = /* @__PURE__ */ memoize(_arktype);
export const arktypeClient = /* @__PURE__ */ memoize(_arktypeClient);
