import { defaultValues } from '$lib/jsonSchema/schemaDefaults.js';
import { memoize } from '$lib/memoize.js';
import type { type } from 'arktype';
import type { JSONSchema7 } from 'json-schema';
import {
	createAdapter,
	type AdapterOptions,
	type ClientValidationAdapter,
	type Infer,
	type ValidationAdapter,
	type ValidationResult
} from './adapters.js';

type Options = Parameters<type.Any['toJsonSchema']>[0];

async function modules() {
	const { type } = await import(/* webpackIgnore: true */ 'arktype');
	return { type };
}

const fetchModule = /* @__PURE__ */ memoize(modules);

const defaultJSONSchemaOptions = {
	fallback: {
		default: (ctx) => {
			if ('domain' in ctx && ctx.domain === 'bigint') {
				return {
					...ctx.base,
					type: 'string',
					format: 'bigint'
				};
			}
			return ctx.base;
		},
		date: (ctx) => ({
			...ctx.base,
			type: 'string',
			format: 'date-time',
			description: ctx.after ? `after ${ctx.after}` : 'anytime'
		})
	}
} satisfies Options;

/* @__NO_SIDE_EFFECTS__ */
export const arktypeToJSONSchema = <S extends type.Any>(schema: S, options?: Options) => {
	return schema.toJsonSchema({ ...defaultJSONSchemaOptions, ...options }) as JSONSchema7;
};

/**
 * Creates defaults for ArkType schemas by filtering out undefined values.
 *
 * ArkType with exactOptionalPropertyTypes requires optional properties to be
 * omitted rather than set to undefined.
 *
 * @param jsonSchema - JSON schema to generate defaults from
 * @returns Default values object without undefined properties
 */
function createArktypeDefaults(jsonSchema: JSONSchema7): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(defaultValues(jsonSchema)).filter(([, value]) => value !== undefined)
	);
}

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
	options?: AdapterOptions<Infer<T, 'arktype'>> & { config?: Options }
): ValidationAdapter<T['infer'], T['inferIn']> {
	const jsonSchema = options?.jsonSchema ?? arktypeToJSONSchema(schema, options?.config);
	return createAdapter({
		superFormValidationLibrary: 'arktype',
		defaults: options?.defaults ?? createArktypeDefaults(jsonSchema),
		jsonSchema,
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
