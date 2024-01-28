import {
	//toJsonSchema,
	type ValidationAdapter,
	type RequiredJsonSchemaOptions,
	type Infer,
	createAdapter,
	type ValidationResult,
	type ClientValidationAdapter,
	type AdapterDefaultOptions
} from './adapters.js';
import { safeParseAsync, type BaseSchema, type BaseSchemaAsync } from 'valibot';
import { memoize } from '$lib/memoize.js';
import { toJSONSchema as valibotToJSON } from '@gcornut/valibot-json-schema';
import type { JSONSchema } from '$lib/index.js';
import { simpleSchema } from './simple-schema/index.js';

type SupportedSchemas = BaseSchema | BaseSchemaAsync;
type Options = Parameters<typeof valibotToJSON>[0];

const defaultOptions = {
	strictObjectTypes: true,
	dateStrategy: 'integer'
} as const;

/* @__NO_SIDE_EFFECTS__ */
const valibotToJsonSchema = (options: Options) => {
	return valibotToJSON({ ...defaultOptions, ...options }) as JSONSchema;
};

async function validate<T extends SupportedSchemas>(
	schema: T,
	data: unknown
): Promise<ValidationResult<Infer<T>>> {
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
}

function _valibot<T extends SupportedSchemas>(
	schema: T,
	options: Omit<Options, 'schema'> | AdapterDefaultOptions<T> | RequiredJsonSchemaOptions<T> = {}
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'valibot',
		validate: async (data) => validate(schema, data),
		jsonSchema:
			'jsonSchema' in options
				? options.jsonSchema
				: 'defaults' in options
					? simpleSchema(options.defaults)
					: // eslint-disable-next-line @typescript-eslint/no-explicit-any
						valibotToJsonSchema({ schema: schema as any, ...options }),
		defaults: 'defaults' in options ? options.defaults : undefined
	});
}

function _valibotClient<T extends SupportedSchemas>(schema: T): ClientValidationAdapter<Infer<T>> {
	return {
		superFormValidationLibrary: 'valibot',
		validate: async (data) => validate(schema, data)
	};
}

export const valibot = /* @__PURE__ */ memoize(_valibot);
export const valibotClient = /* @__PURE__ */ memoize(_valibotClient);
