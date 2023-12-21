import type { AnyZodObject, ZodEffects } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import { adapter, type ValidationAdapter } from './index.js';
import { zodToJsonSchema as zodToJson, type Options } from 'zod-to-json-schema';
import type { z } from 'zod';

const defaultOptions: Partial<Options> = {
	dateStrategy: 'integer',
	pipeStrategy: 'output'
} as const;

export const zodToJsonSchema = (...params: Parameters<typeof zodToJson>) => {
	params[1] = typeof params[1] == 'object' ? { ...defaultOptions, ...params[1] } : defaultOptions;
	return zodToJson(...params) as JSONSchema7;
};

/*
type UnwrapZodEffects<T> = T extends ZodEffects<infer U> ? UnwrapZodEffects<U> : T;

type DeepUnwrapZodEffects<T> = {
	[K in keyof T]: T[K] extends AnyZodObject ? UnwrapZodEffects<T[K]> : T[K];
};
*/

type Arr<N extends number, T extends unknown[] = []> = T['length'] extends N
	? T
	: Arr<N, [...T, unknown]>;

//type Increment<N extends number> = [...Arr<N>, unknown]['length'];
type Decrement<N extends number> = Arr<N> extends [unknown, ...infer U] ? U['length'] : never;

type RecursiveZodEffects<T extends AnyZodObject, Depth extends number> = Depth extends 0
	? T
	: ZodEffects<RecursiveZodEffects<T, Decrement<Depth>>> | RecursiveZodEffects<T, Decrement<Depth>>;

type ZodValidation = RecursiveZodEffects<AnyZodObject, 10>;

function _zod<T extends ZodValidation>(
	schema: T
): ValidationAdapter<z.infer<T>, 'with-constraints'> {
	return {
		superFormValidationLibrary: 'zod',
		validator: schema,
		jsonSchema: zodToJsonSchema(schema)
	};
}

export const zod = adapter(_zod);
