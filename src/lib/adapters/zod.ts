import { type ZodErrorMap, type ZodType, type ZodTypeDef } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import {
	type AdapterOptions,
	type ValidationAdapter,
	type Infer,
	type InferIn,
	createAdapter,
	type ValidationResult,
	type ClientValidationAdapter
} from './adapters.js';
import { zodToJsonSchema as zodToJson, type Options } from 'zod-to-json-schema';
import { memoize } from '$lib/memoize.js';

const defaultOptions: Partial<Options> = {
	dateStrategy: 'integer',
	pipeStrategy: 'output',
	$refStrategy: 'none'
} as const;

/* @__NO_SIDE_EFFECTS__ */
export const zodToJSONSchema = (...params: Parameters<typeof zodToJson>) => {
	params[1] = typeof params[1] == 'object' ? { ...defaultOptions, ...params[1] } : defaultOptions;
	return zodToJson(...params) as JSONSchema7;
};

// allows for any object schema
// allows `undefined` in the input type to account for ZodDefault
export type ZodObjectType = ZodType<
	Record<string, unknown>,
	ZodTypeDef,
	Record<string, unknown> | undefined
>;
export type ZodObjectTypes = ZodObjectType;

// left in for compatibility reasons
export type ZodValidation<T extends ZodObjectTypes = ZodObjectTypes> = T;

async function validate<T extends ZodValidation>(
	schema: T,
	data: unknown,
	errorMap: ZodErrorMap | undefined
): Promise<ValidationResult<Infer<T, 'zod'>>> {
	const result = await schema.safeParseAsync(data, { errorMap });
	if (result.success) {
		return {
			data: result.data as Infer<T, 'zod'>,
			success: true
		};
	}

	return {
		issues: result.error.issues.map(({ message, path }) => ({ message, path })),
		success: false
	};
}

function _zod<T extends ZodValidation>(
	schema: T,
	options?: AdapterOptions<Infer<T, 'zod'>> & { errorMap?: ZodErrorMap; config?: Partial<Options> }
): ValidationAdapter<Infer<T, 'zod'>, InferIn<T, 'zod'>> {
	return createAdapter({
		superFormValidationLibrary: 'zod',
		validate: async (data) => {
			return validate(schema, data, options?.errorMap);
		},
		jsonSchema: options?.jsonSchema ?? zodToJSONSchema(schema, options?.config),
		defaults: options?.defaults
	});
}

function _zodClient<T extends ZodValidation>(
	schema: T,
	options?: { errorMap?: ZodErrorMap }
): ClientValidationAdapter<Infer<T, 'zod'>, InferIn<T, 'zod'>> {
	return {
		superFormValidationLibrary: 'zod',
		validate: async (data) => validate(schema, data, options?.errorMap)
	};
}

export const zod = /* @__PURE__ */ memoize(_zod);
export const zodClient = /* @__PURE__ */ memoize(_zodClient);
