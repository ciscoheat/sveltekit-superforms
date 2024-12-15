import type { TSchema, Static as Static$1 } from '@sinclair/typebox';
import type { type } from 'arktype';
import type { AnySchema } from 'joi';
import type {
	Infer as ClassValidatorInfer,
	InferIn as ClassValidatorInferIn,
	Schema as ClassValidatorSchema
} from '@typeschema/class-validator';

import type {
	GenericSchema,
	GenericSchemaAsync,
	InferInput as Input,
	InferOutput as Output
} from 'valibot';
import type { Schema as Schema$2, InferType } from 'yup';
import type { ZodTypeAny, input, output } from 'zod';
import type { SchemaTypes, Infer as VineInfer } from '@vinejs/vine/types';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import type { Struct, Infer as Infer$2 } from 'superstruct';
import type { Schema as Schema$1 } from 'effect';

/*
import type { SchemaObject } from 'ajv';
import type { Type as Type$1 } from '@deepkit/type';
import type { Schema as Schema$1 } from 'effect';
import type { Any, OutputOf, TypeOf } from 'io-ts';
import type { Predicate, Infer as Infer$1 } from 'ow';
import type { Runtype, Static } from 'runtypes';
*/

type Replace<T, From, To> =
	NonNullable<T> extends From
		? To | Exclude<T, From>
		: NonNullable<T> extends object
			? { [K in keyof T]: Replace<T[K], From, To> }
			: T;

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
	base: type.Any;
	input: this['schema'] extends type.Any ? this['schema']['inferIn'] : never;
	output: this['schema'] extends type.Any ? this['schema']['infer'] : never;
}

interface ClassValidatorResolver extends Resolver {
	base: ClassValidatorSchema;
	input: this['schema'] extends ClassValidatorSchema
		? ClassValidatorInferIn<this['schema']>
		: never;
	output: this['schema'] extends ClassValidatorSchema ? ClassValidatorInfer<this['schema']> : never;
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
	base: GenericSchema | GenericSchemaAsync;
	input: this['schema'] extends GenericSchema | GenericSchemaAsync ? Input<this['schema']> : never;
	output: this['schema'] extends GenericSchema | GenericSchemaAsync
		? Output<this['schema']>
		: never;
}

interface YupResolver extends Resolver {
	base: Schema$2;
	input: this['schema'] extends Schema$2 ? InferType<this['schema']> : never;
	output: this['schema'] extends Schema$2 ? InferType<this['schema']> : never;
}

interface ZodResolver extends Resolver {
	base: ZodTypeAny;
	input: this['schema'] extends ZodTypeAny ? input<this['schema']> : never;
	output: this['schema'] extends ZodTypeAny ? output<this['schema']> : never;
}

interface VineResolver extends Resolver {
	base: SchemaTypes;
	input: this['schema'] extends SchemaTypes
		? Replace<VineInfer<this['schema']>, Date, string>
		: never;
	output: this['schema'] extends SchemaTypes ? VineInfer<this['schema']> : never;
}

interface SchemasafeResolver<Schema extends JSONSchema, Data = FromSchema<Schema>>
	extends Resolver {
	base: JSONSchema;
	input: this['schema'] extends Schema ? Data : never;
	output: this['schema'] extends Schema ? Data : never;
}

interface SuperstructResolver extends Resolver {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	base: Struct<any, any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	input: this['schema'] extends Struct<any, any> ? Infer$2<this['schema']> : never;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	output: this['schema'] extends Struct<any, any> ? Infer$2<this['schema']> : never;
}

interface EffectResolver extends Resolver {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	base: Schema$1.Schema<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	input: this['schema'] extends Schema$1.Schema<any>
		? Schema$1.Schema.Encoded<this['schema']>
		: never;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	output: this['schema'] extends Schema$1.Schema<any>
		? Schema$1.Schema.Type<this['schema']>
		: never;
}

/*
interface AjvResolver extends Resolver {
	base: SchemaObject;
}

interface DeepkitResolver extends Resolver {
  base: Type$1;
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

*/
export type Registry = {
	arktype: ArkTypeResolver;
	classvalidator: ClassValidatorResolver;
	custom: CustomResolver;
	joi: JoiResolver;
	typebox: TypeBoxResolver;
	valibot: ValibotResolver;
	yup: YupResolver;
	zod: ZodResolver;
	vine: VineResolver;
	schemasafe: SchemasafeResolver<JSONSchema>;
	superstruct: SuperstructResolver;
	effect: EffectResolver;
	/*
		ajv: AjvResolver;
    deepkit: DeepkitResolver;
    'io-ts': IoTsResolver;
    ow: OwResolver;
    runtypes: RuntypesResolver;
    */
};

type Infer<TSchema extends Schema, Keys extends keyof Registry = keyof Registry> = UnknownIfNever<
	{
		[K in Keys]: IfDefined<InferOutput<Registry[K], TSchema>>;
	}[Keys]
>;
type InferIn<TSchema extends Schema, Keys extends keyof Registry = keyof Registry> = UnknownIfNever<
	{
		[K in Keys]: IfDefined<InferInput<Registry[K], TSchema>>;
	}[Keys]
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
