import type { TSchema, Static as Static$1 } from '@sinclair/typebox';
import type { Type } from 'arktype';
import type { AnySchema } from 'joi';
import type { BaseSchema, BaseSchemaAsync, Input, Output } from 'valibot';
import type { Schema as Schema$2, InferType } from 'yup';
import type { ZodSchema, input, output } from 'zod';
import type { SchemaTypes } from '@vinejs/vine/types';

/*
import type { SchemaObject } from 'ajv';
import type { Type as Type$1 } from '@deepkit/type';
import type { Schema as Schema$1 } from '@effect/schema/Schema';
import type { Any, OutputOf, TypeOf } from 'io-ts';
import type { Predicate, Infer as Infer$1 } from 'ow';
import type { Runtype, Static } from 'runtypes';
import type { Struct, Infer as Infer$2 } from 'superstruct';
*/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IfDefined<T> = any extends T ? never : T;
type UnknownIfNever<T> = [T] extends [never] ? unknown : T;

type Schema = {
	[K in keyof Registry]: IfDefined<InferSchema<Registry[K]>>;
}[keyof Registry];
interface Resolver<TSchema = unknown> {
	schema: TSchema;
	input: unknown;
	output: unknown;
	base: unknown;
}
type InferInput<TResolver extends Resolver, TSchema> = (TResolver & {
	schema: TSchema;
})['input'];
type InferOutput<TResolver extends Resolver, TSchema> = (TResolver & {
	schema: TSchema;
})['output'];
type InferSchema<TResolver extends Resolver> = TResolver['base'];

type ValidationIssue = {
	message: string;
	path?: Array<string | number | symbol>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidationResult<TOutput = any> =
	| {
			success: true;
			data: TOutput;
	  }
	| {
			success: false;
			issues: Array<ValidationIssue>;
	  };

interface ArkTypeResolver extends Resolver {
	base: Type;
	input: this['schema'] extends Type ? this['schema']['inferIn'] : never;
	output: this['schema'] extends Type ? this['schema']['infer'] : never;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomSchema<T = any> = (data: unknown) => Promise<T> | T;
interface CustomResolver extends Resolver {
	base: CustomSchema;
	input: this['schema'] extends CustomSchema
		? keyof this['schema'] extends never
			? Awaited<ReturnType<this['schema']>>
			: never
		: never;
	output: this['schema'] extends CustomSchema
		? keyof this['schema'] extends never
			? Awaited<ReturnType<this['schema']>>
			: never
		: never;
}

interface JoiResolver extends Resolver {
	base: AnySchema;
}

interface TypeBoxResolver extends Resolver {
	base: TSchema;
	input: this['schema'] extends TSchema ? Static$1<this['schema']> : never;
	output: this['schema'] extends TSchema ? Static$1<this['schema']> : never;
}

interface ValibotResolver extends Resolver {
	base: BaseSchema | BaseSchemaAsync;
	input: this['schema'] extends BaseSchema | BaseSchemaAsync ? Input<this['schema']> : never;
	output: this['schema'] extends BaseSchema | BaseSchemaAsync ? Output<this['schema']> : never;
}

interface YupResolver extends Resolver {
	base: Schema$2;
	input: this['schema'] extends Schema$2 ? InferType<this['schema']> : never;
	output: this['schema'] extends Schema$2 ? InferType<this['schema']> : never;
}

interface ZodResolver extends Resolver {
	base: ZodSchema;
	input: this['schema'] extends ZodSchema ? input<this['schema']> : never;
	output: this['schema'] extends ZodSchema ? output<this['schema']> : never;
}

interface VineResolver extends Resolver {
	base: SchemaTypes;
}

/*
interface AjvResolver extends Resolver {
	base: SchemaObject;
}

interface DeepkitResolver extends Resolver {
  base: Type$1;
}

interface EffectResolver extends Resolver {
  base: Schema$1<any>;
  input: this['schema'] extends Schema$1<any> ? Schema$1.From<this['schema']> : never;
  output: this['schema'] extends Schema$1<any> ? Schema$1.To<this['schema']> : never;
}

interface IoTsResolver extends Resolver {
  base: Any;
  input: this['schema'] extends Any ? OutputOf<this['schema']> : never;
  output: this['schema'] extends Any ? TypeOf<this['schema']> : never;
}

interface OwResolver extends Resolver {
    base: Predicate;
    input: this['schema'] extends Predicate ? Infer$1<this['schema']> : never;
    output: this['schema'] extends Predicate ? Infer$1<this['schema']> : never;
}

interface RuntypesResolver extends Resolver {
    base: Runtype;
    input: this['schema'] extends Runtype ? Static<this['schema']> : never;
    output: this['schema'] extends Runtype ? Static<this['schema']> : never;
}

interface SuperstructResolver extends Resolver {
    base: Struct<any, any>;
    output: this['schema'] extends Struct<any, any> ? Infer$2<this['schema']> : never;
}
*/

type Registry = {
	arktype: ArkTypeResolver;
	custom: CustomResolver;
	joi: JoiResolver;
	typebox: TypeBoxResolver;
	valibot: ValibotResolver;
	yup: YupResolver;
	zod: ZodResolver;
	vine: VineResolver;
	/*
		ajv: AjvResolver;
    deepkit: DeepkitResolver;
    effect: EffectResolver;
    'io-ts': IoTsResolver;
    ow: OwResolver;
    runtypes: RuntypesResolver;
    superstruct: SuperstructResolver;
    */
};

type Infer<TSchema extends Schema> = UnknownIfNever<
	{
		[K in keyof Registry]: IfDefined<InferOutput<Registry[K], TSchema>>;
	}[keyof Registry]
>;
type InferIn<TSchema extends Schema> = UnknownIfNever<
	{
		[K in keyof Registry]: IfDefined<InferInput<Registry[K], TSchema>>;
	}[keyof Registry]
>;

/*
type TypeSchema<TOutput, TInput = TOutput> = {
    _input: TInput;
    _output: TOutput;
    assert(data: unknown): Promise<TOutput>;
    parse(data: unknown): Promise<TOutput>;
    validate(data: unknown): Promise<{
        data: TOutput;
    } | {
        issues: Array<ValidationIssue>;
    }>;
};
declare function wrap<TSchema extends Schema>(schema: TSchema): TypeSchema<Infer<TSchema>, InferIn<TSchema>>;
declare function validate<TSchema extends Schema>(schema: TSchema, data: unknown): Promise<ValidationResult<Infer<TSchema>>>;
declare function assert<TSchema extends Schema>(schema: TSchema, data: unknown): Promise<Infer<TSchema>>;
*/

export type { Infer, InferIn, Schema, ValidationIssue, ValidationResult };
