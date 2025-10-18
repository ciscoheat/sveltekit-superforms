import {
	type $ZodObject,
	type $ZodErrorMap,
	type $ZodDiscriminatedUnion,
	safeParseAsync,
	toJSONSchema,
	config
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
			ctx.jsonSchema.type = 'integer';
			ctx.jsonSchema.format = 'unix-time';
		} else if (def.type === 'bigint') {
			ctx.jsonSchema.type = 'string';
			ctx.jsonSchema.format = 'bigint';
		} else if (def.type === 'set') {
			// Handle z.set() - convert to array with uniqueItems
			ctx.jsonSchema.type = 'array';
			ctx.jsonSchema.uniqueItems = true;
			// If there's a default value, convert Set to Array
			if ('default' in ctx.jsonSchema && ctx.jsonSchema.default instanceof Set) {
				ctx.jsonSchema.default = Array.from(ctx.jsonSchema.default);
			}
		} else if (def.type === 'map') {
			// Handle z.map() - convert to array of [key, value] tuples
			ctx.jsonSchema.type = 'array';
			ctx.jsonSchema.format = 'map';
			// If there's a default value, convert Map to Array
			if ('default' in ctx.jsonSchema && ctx.jsonSchema.default instanceof Map) {
				ctx.jsonSchema.default = Array.from(ctx.jsonSchema.default);
			}
		} else if (def.type === 'default') {
			// Handle z.default() wrapping unrepresentable types
			// The default value was already serialized by Zod, which converts Set/Map to {}
			// We need to get the original value and convert it properly
			const innerDef = def.innerType._zod.def;
			if (innerDef.type === 'set' && def.defaultValue instanceof Set) {
				// Set the proper schema type for sets
				ctx.jsonSchema.type = 'array';
				ctx.jsonSchema.uniqueItems = true;
				// Convert the default value from Set to Array
				ctx.jsonSchema.default = Array.from(def.defaultValue);
			} else if (innerDef.type === 'map' && def.defaultValue instanceof Map) {
				// Set the proper schema type for maps
				ctx.jsonSchema.type = 'array';
				ctx.jsonSchema.format = 'map';
				// Convert the default value from Map to Array of tuples
				ctx.jsonSchema.default = Array.from(def.defaultValue);
			}
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
	// Use Zod's global config error map if none provided to preserve custom messages.
	if (error === undefined) error = config().localeError;
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
