import {
	createAdapter,
	createJsonSchema,
	type ValidationAdapter,
	type AdapterOptions,
	type Infer,
	type ValidationResult,
	type ClientValidationAdapter
} from './adapters.js';
import { safeParseAsync, type BaseSchema, type BaseSchemaAsync } from 'valibot';
import { memoize } from '$lib/memoize.js';
import { toJSONSchema as valibotToJSON } from '@gcornut/valibot-json-schema';
import type { JSONSchema } from '$lib/index.js';

type SupportedSchemas = BaseSchema | BaseSchemaAsync;

// TODO: Use from valibot-json-schema when Options are exported
interface Options {
	/**
	 * Main schema (referenced at the root of the JSON schema).
	 */
	schema?: SupportedSchemas;
	/**
	 * Additional schemas (referenced in the JSON schema `definitions`).
	 */
	definitions?: Record<string, SupportedSchemas>;
	/**
	 * Make all object type strict (`additionalProperties: false`).
	 */
	strictObjectTypes?: boolean;
	/**
	 * Date output:
	 * 'integer' sets the type to 'integer' and format to 'unix-time'.
	 * 'string' sets the type to 'string' and format to 'date-time'.
	 */
	dateStrategy?: 'string' | 'integer';
}

const defaultOptions = {
	strictObjectTypes: true,
	dateStrategy: 'integer' as const
};

/* @__NO_SIDE_EFFECTS__ */
const valibotToJsonSchema = (options: Options) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return valibotToJSON({ ...defaultOptions, ...(options as any) }) as JSONSchema;
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
	options: Omit<Options, 'schema'> | AdapterOptions<T> = {}
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'valibot',
		validate: async (data) => validate(schema, data),
		jsonSchema: createJsonSchema(
			options,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			() => valibotToJsonSchema({ schema: schema as any, ...options })
		),
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
