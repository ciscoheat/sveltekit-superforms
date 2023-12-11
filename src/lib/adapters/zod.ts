import type { AnyZodObject, ZodEffects } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import type { ValidationAdapter } from './index.js';
import { zodToJsonSchema as zodToJson, type Options } from 'zod-to-json-schema';
import type { z } from 'zod';
import { memoize } from '$lib/memoize.js';

const defaultOptions: Partial<Options> = {
	dateStrategy: 'integer',
	pipeStrategy: 'input' // TODO: Switch to output as soon as it's available
} as const;

export const zodToJsonSchema = (...params: Parameters<typeof zodToJson>) => {
	params[1] = typeof params[1] == 'object' ? { ...defaultOptions, ...params[1] } : defaultOptions;
	return zodToJson(...params) as JSONSchema7;
};

type ZodValidation<T extends AnyZodObject> =
	| T
	| ZodEffects<T>
	| ZodEffects<ZodEffects<T>>
	| ZodEffects<ZodEffects<ZodEffects<T>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>;

function _zod<T extends ZodValidation<AnyZodObject>>(schema: T): ValidationAdapter<z.infer<T>> {
	return {
		superFormValidationLibrary: 'zod',
		validator: schema,
		jsonSchema: zodToJsonSchema(schema)
	};
}

export const zod = memoize(_zod);
