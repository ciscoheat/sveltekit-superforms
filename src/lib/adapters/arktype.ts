import type { type } from 'arktype';
import {
	type ValidationAdapter,
	type RequiredDefaultsOptions,
	createAdapter,
	type ClientValidationAdapter,
	type ValidationResult,
	createJsonSchema
} from './adapters.js';
import { memoize } from '$lib/memoize.js';

async function modules() {
	const { type } = await import(/* webpackIgnore: true */ 'arktype');
	return { type };
}

const fetchModule = /* @__PURE__ */ memoize(modules);

async function _validate<T extends type.Any>(
	schema: T,
	data: unknown
): Promise<ValidationResult<T['infer']>> {
	const { type } = await fetchModule();
	const result = schema(data);
	if (!(result instanceof type.errors)) {
		return {
			data: result as T['infer'],
			success: true
		};
	}
	const issues = [];
	for (const error of result) {
		issues.push({ message: error.problem, path: Array.from(error.path) });
	}
	return {
		issues,
		success: false
	};
}

function _arktype<T extends type.Any>(
	schema: T,
	options: RequiredDefaultsOptions<T['infer']>
): ValidationAdapter<T['infer'], T['inferIn']> {
	return createAdapter({
		superFormValidationLibrary: 'arktype',
		defaults: options.defaults,
		jsonSchema: createJsonSchema(options),
		validate: async (data) => _validate<T>(schema, data)
	});
}

function _arktypeClient<T extends type.Any>(
	schema: T
): ClientValidationAdapter<T['infer'], T['inferIn']> {
	return {
		superFormValidationLibrary: 'arktype',
		validate: async (data) => _validate<T>(schema, data)
	};
}

export const arktype = /* @__PURE__ */ memoize(_arktype);
export const arktypeClient = /* @__PURE__ */ memoize(_arktypeClient);
