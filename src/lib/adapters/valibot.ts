import {
	createAdapter,
	type ValidationAdapter,
	type AdapterOptions,
	type Infer,
	type InferIn,
	type ValidationResult,
	type ClientValidationAdapter
} from './adapters.js';
import { safeParseAsync, type BaseSchema, type BaseSchemaAsync } from 'valibot';
import { memoize } from '$lib/memoize.js';
import {
	type ToJSONSchemaOptions,
	toJSONSchema as valibotToJSON
} from '@gcornut/valibot-json-schema';
import type { JSONSchema } from '../jsonSchema/index.js';
import type { Prettify } from '$lib/utils.js';

type SupportedSchemas = BaseSchema | BaseSchemaAsync;

type SchemaConfig = NonNullable<Parameters<typeof safeParseAsync>[2]>;

const defaultOptions = {
	strictObjectTypes: true,
	dateStrategy: 'integer' as const,
	ignoreUnknownValidation: true
} satisfies ToJSONSchemaOptions;

/* @__NO_SIDE_EFFECTS__ */
export const valibotToJSONSchema = (options: ToJSONSchemaOptions) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return valibotToJSON({ ...defaultOptions, ...(options as any) }) as JSONSchema;
};

async function validate<T extends SupportedSchemas>(
	schema: T,
	data: unknown,
	config?: SchemaConfig
): Promise<ValidationResult<Infer<T>>> {
	const result = await safeParseAsync(schema, data, config);
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
	options: Prettify<
		Omit<ToJSONSchemaOptions, 'schema'> &
			AdapterOptions<T> & {
				config?: SchemaConfig;
			}
	> = {}
): ValidationAdapter<Infer<T>, InferIn<T>> {
	return createAdapter({
		superFormValidationLibrary: 'valibot',
		validate: async (data) => validate(schema, data, options?.config),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		jsonSchema: options?.jsonSchema ?? valibotToJSONSchema({ schema: schema as any, ...options }),
		defaults: 'defaults' in options ? options.defaults : undefined
	});
}

function _valibotClient<T extends SupportedSchemas>(
	schema: T
): ClientValidationAdapter<Infer<T>, InferIn<T>> {
	return {
		superFormValidationLibrary: 'valibot',
		validate: async (data) => validate(schema, data)
	};
}

export const valibot = /* @__PURE__ */ memoize(_valibot);
export const valibotClient = /* @__PURE__ */ memoize(_valibotClient);
