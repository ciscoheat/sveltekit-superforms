import {
	type $ZodObject,
	type $ZodErrorMap,
	type $ZodDiscriminatedUnion,
	safeParseAsync,
	toJSONSchema
} from 'zod/v4/core';
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
import { memoize } from '$lib/memoize.js';

type Options = NonNullable<Parameters<typeof toJSONSchema>[1]>;

export type ZodValidationSchema =
	| $ZodObject
	| $ZodDiscriminatedUnion<
			(
				| $ZodObject
				| $ZodDiscriminatedUnion<
						(
							| $ZodObject
							| $ZodDiscriminatedUnion<
									(
										| $ZodObject
										| $ZodDiscriminatedUnion<($ZodObject | $ZodDiscriminatedUnion<$ZodObject[]>)[]>
									)[]
							  >
						)[]
				  >
			)[]
	  >;

const defaultJSONSchemaOptions = {
	unrepresentable: 'any',
	override: (ctx) => {
		const def = ctx.zodSchema._zod.def;
		if (def.type === 'date') {
			ctx.jsonSchema.type = 'string';
			ctx.jsonSchema.format = 'date-time';
		} else if (def.type === 'bigint') {
			ctx.jsonSchema.type = 'string';
			ctx.jsonSchema.format = 'bigint';
		}
	}
} satisfies Options;

/* @__NO_SIDE_EFFECTS__ */
export const zodToJSONSchema = <S extends ZodValidationSchema>(schema: S, options?: Options) => {
	return toJSONSchema(schema, { ...defaultJSONSchemaOptions, ...options }) as JSONSchema7;
};

async function validate<T extends ZodValidationSchema>(
	schema: T,
	data: unknown,
	error: $ZodErrorMap | undefined
): Promise<ValidationResult<Infer<T, 'zod4'>>> {
	const result = await safeParseAsync(schema, data, { error });
	if (result.success) {
		return {
			data: result.data as Infer<T, 'zod4'>,
			success: true
		};
	}

	return {
		issues: result.error.issues.map(({ message, path }) => ({ message, path })),
		success: false
	};
}

function _zod4<T extends ZodValidationSchema>(
	schema: T,
	options?: AdapterOptions<Infer<T, 'zod4'>> & { error?: $ZodErrorMap; config?: Options }
): ValidationAdapter<Infer<T, 'zod4'>, InferIn<T, 'zod4'>> {
	return createAdapter({
		superFormValidationLibrary: 'zod4',
		validate: async (data) => {
			return validate(schema, data, options?.error);
		},
		jsonSchema: options?.jsonSchema ?? zodToJSONSchema(schema, options?.config),
		defaults: options?.defaults
	});
}

function _zod4Client<T extends ZodValidationSchema>(
	schema: T,
	options?: { error?: $ZodErrorMap }
): ClientValidationAdapter<Infer<T, 'zod4'>, InferIn<T, 'zod4'>> {
	return {
		superFormValidationLibrary: 'zod4',
		validate: async (data) => validate(schema, data, options?.error)
	};
}

export const zod = /* @__PURE__ */ memoize(_zod4);
export const zodClient = /* @__PURE__ */ memoize(_zod4Client);
