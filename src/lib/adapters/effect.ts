import { Schema, JSONSchema, ArrayFormatter } from '@effect/schema';
import { Either } from 'effect';
import type { JSONSchema as TJSONSchema } from '../jsonSchema/index.js';
import {
	createAdapter,
	type AdapterOptions,
	type ClientValidationAdapter,
	type Infer,
	type InferIn,
	type ValidationAdapter,
	type ValidationResult
} from './adapters.js';
import type { ParseOptions } from '@effect/schema/AST';
import { memoize } from '$lib/memoize.js';

export const effectToJSONSchema = <A, I>(schema: Schema.Schema<A, I>) => {
	// effect's json schema type is slightly different so we have to cast it
	return JSONSchema.make(schema) as TJSONSchema;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = Schema.Schema<any, any>;

async function validate<T extends AnySchema>(
	schema: T,
	data: unknown,
	options?: AdapterOptions<Infer<T>> & { parseOptions?: ParseOptions }
): Promise<ValidationResult<Infer<T>>> {
	const result = Schema.decodeUnknownEither(schema, { errors: 'all' })(data, options?.parseOptions);
	if (Either.isRight(result)) {
		return {
			data: result.right as Infer<T>,
			success: true
		};
	}
	return {
		// get rid of the _tag property
		issues: ArrayFormatter.formatErrorSync(result.left).map(({ message, path }) => ({
			message,
			path: [...path] // path is readonly array so we have to copy it
		})),
		success: false
	} satisfies ValidationResult<Infer<T>>;
}

function _effect<T extends AnySchema>(
	schema: T,
	options?: AdapterOptions<Infer<T>> & { parseOptions?: ParseOptions }
): ValidationAdapter<Infer<T>, InferIn<T>> {
	// @ts-expect-error idk why this happens, it seems to happen in other adapters too
	return createAdapter({
		superFormValidationLibrary: 'effect',
		validate: async (data) => validate(schema, data, options),
		jsonSchema: options?.jsonSchema ?? effectToJSONSchema(schema),
		defaults: options?.defaults
	});
}

function _effectClient<T extends AnySchema>(
	schema: T,
	options?: AdapterOptions<Infer<T>> & { parseOptions?: ParseOptions }
): ClientValidationAdapter<Infer<T>, InferIn<T>> {
	return {
		superFormValidationLibrary: 'effect',
		validate: async (data) => validate(schema, data, options)
	};
}

export const effect = /* @__PURE__ */ memoize(_effect);
export const effectClient = /* @__PURE__ */ memoize(_effectClient);
