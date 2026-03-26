import type { JSONSchema7 } from 'json-schema';
import type { SchemaDescription } from 'yup';

export type YupType =
	| 'array'
	| 'boolean'
	| 'date'
	| 'lazy'
	| 'mixed'
	| 'number'
	| 'object'
	| 'string'
	| 'tuple';

export type Converters = Record<YupType, Converter>;

export type Converter = (description: SchemaDescription, converters: Converters) => JSONSchema7;

export type Meta = {
	jsonSchema?: JSONSchema7;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
};

/* This is basically Yup's ResolveOptions type that yup doesn't actually export with `converters` added. */
export type ResolveOptions = {
	value?: unknown;
	parent?: unknown;
	context?: unknown;
	converters?: Partial<Converters>;
};

export type JsonSchemaCallback = (jsonSchema: JSONSchema7) => JSONSchema7;
