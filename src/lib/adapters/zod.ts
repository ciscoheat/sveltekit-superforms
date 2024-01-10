import type { AnyZodObject, ZodDefault, ZodEffects, ZodUnion } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import { type JsonSchemaOptions, type ValidationAdapter, createAdapter } from './adapters.js';
import { zodToJsonSchema as zodToJson, type Options } from 'zod-to-json-schema';
import type { Infer } from '$lib/index.js';
import { memoize } from '$lib/memoize.js';

const defaultOptions: Partial<Options> = {
	dateStrategy: 'integer',
	pipeStrategy: 'output'
} as const;

export const zodToJsonSchema = (...params: Parameters<typeof zodToJson>) => {
	params[1] = typeof params[1] == 'object' ? { ...defaultOptions, ...params[1] } : defaultOptions;
	return zodToJson(...params) as JSONSchema7;
};

type ZodObjectUnion<T extends AnyZodObject> = ZodUnion<
	[ZodValidation<T>, ZodValidation<T>, ...ZodValidation<T>[]]
>;

export type ZodValidation<T extends AnyZodObject | ZodObjectUnion<AnyZodObject>> =
	| T
	| ZodEffects<T>
	| ZodEffects<ZodEffects<T>>
	| ZodEffects<ZodEffects<ZodEffects<T>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>>>
	| ZodDefault<T>
	| ZodDefault<ZodEffects<T>>
	| ZodDefault<ZodEffects<ZodEffects<T>>>
	| ZodDefault<ZodEffects<ZodEffects<ZodEffects<T>>>>
	| ZodDefault<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>
	| ZodDefault<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>>
	| ZodDefault<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>>>
	| ZodDefault<
			ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>>>
	  >;

function _zod<T extends ZodValidation<AnyZodObject | ZodObjectUnion<AnyZodObject>>>(
	schema: T,
	options?: JsonSchemaOptions<Infer<T>>
): ValidationAdapter<Infer<T>> {
	return createAdapter({
		superFormValidationLibrary: 'zod',
		async validate(data) {
			const result = await schema.safeParseAsync(data);
			if (result.success) {
				return {
					data: result.data as Infer<T>,
					success: true
				};
			}
			return {
				issues: result.error.issues.map(({ message, path }) => ({ message, path })),
				success: false
			};
		},
		jsonSchema: options?.jsonSchema ?? zodToJsonSchema(schema),
		defaults: options?.defaults
	});
}

export const zod = memoize(_zod);
