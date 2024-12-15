import {
	createAdapter,
	type ValidationAdapter,
	type AdapterOptions,
	type Infer,
	type InferIn,
	type ValidationResult,
	type ClientValidationAdapter
} from './adapters.js';
import {
	safeParseAsync,
	type GenericSchema,
	type GenericSchemaAsync,
	type Config,
	type GenericIssue,
	type IssuePathItem,
	type SetPathItem
} from 'valibot';
import { memoize } from '$lib/memoize.js';
import {
	type ToJSONSchemaOptions,
	toJSONSchema as valibotToJSON
} from '@gcornut/valibot-json-schema';
import type { JSONSchema } from '../jsonSchema/index.js';

type SupportedSchemas = GenericSchema | GenericSchemaAsync;

const defaultOptions = {
	strictObjectTypes: true,
	dateStrategy: 'integer' as const,
	ignoreUnknownValidation: true,
	customSchemaConversion: {
		custom: () => ({}),
		instance: () => ({}),
		file: () => ({}),
		blob: () => ({})
	}
} satisfies ToJSONSchemaOptions;

/* @__NO_SIDE_EFFECTS__ */
export const valibotToJSONSchema = (options: ToJSONSchemaOptions) => {
	return valibotToJSON({ ...defaultOptions, ...options }) as JSONSchema;
};

async function _validate<T extends SupportedSchemas>(
	schema: T,
	data: unknown,
	config?: Config<GenericIssue<unknown>>
): Promise<ValidationResult<Infer<T, 'valibot'>>> {
	const result = await safeParseAsync(schema, data, config);
	if (result.success) {
		return {
			data: result.output as Infer<T, 'valibot'>,
			success: true
		};
	}
	return {
		issues: result.issues.map(({ message, path }) => ({
			message,
			path: (path as Exclude<IssuePathItem, SetPathItem>[])?.map(({ key }) => key) as string[]
		})),
		success: false
	};
}

function _valibot<T extends SupportedSchemas>(
	schema: T,
	options: Omit<ToJSONSchemaOptions, 'schema'> &
		AdapterOptions<Infer<T, 'valibot'>> & {
			config?: Config<GenericIssue<unknown>>;
		} = {}
): ValidationAdapter<Infer<T, 'valibot'>, InferIn<T, 'valibot'>> {
	return createAdapter({
		superFormValidationLibrary: 'valibot',
		validate: async (data) => _validate<T>(schema, data, options?.config),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		jsonSchema: options?.jsonSchema ?? valibotToJSONSchema({ schema: schema as any, ...options }),
		defaults: 'defaults' in options ? options.defaults : undefined
	});
}

function _valibotClient<T extends SupportedSchemas>(
	schema: T
): ClientValidationAdapter<Infer<T, 'valibot'>, InferIn<T, 'valibot'>> {
	return {
		superFormValidationLibrary: 'valibot',
		validate: async (data) => _validate<T>(schema, data)
	};
}

export const valibot = /* @__PURE__ */ memoize(_valibot);
export const valibotClient = /* @__PURE__ */ memoize(_valibotClient);
