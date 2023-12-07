import { SchemaError as SchemaError } from '$lib/index.js';
import type { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';

export type { JSONSchema7 as JSONSchema } from 'json-schema';

type FormatType = 'unix-time' | 'bigint' | 'any' | 'symbol' | 'set';

export type SchemaType = JSONSchema7TypeName | FormatType;

export type SchemaInfo = {
	types: Set<Exclude<SchemaType, 'null'>>;
	isOptional: boolean;
	isNullable: boolean;
	schema: JSONSchema7;
	union: ReturnType<typeof unionInfo>;
};

const conversionFormatTypes = ['unix-time', 'bigint', 'any', 'symbol', 'set'];

function unionInfo(schema: JSONSchema7) {
	if (!schema.anyOf) return { types: undefined, isNullable: false };

	const filtered = schema.anyOf.filter((s) => typeof s !== 'boolean') as JSONSchema7[];
	const output = filtered.filter((s) => s.type !== 'null');
	const isNullable = filtered.length != output.length;

	switch (output.length) {
		// 0 = Only null
		case 0:
			return { types: undefined, isNullable };
		case 1:
			return { type: output[0], isNullable };
		default:
			return { types: output, isNullable };
	}
}

export function schemaInfo(
	schema: JSONSchema7Definition,
	isOptional = false,
	path: string[] = []
	//onUnion?: (union: JSONSchema7[], isOptional: boolean, isNullable: boolean) => SchemaInfo
): SchemaInfo | undefined {
	//const union = unionInfo(schema);

	/*
	if (union.types) {
		if (!onUnion) throw new SchemaError('Unions (anyOf) not supported without onUnion callback.');
		return onUnion(union.types, isOptional, union.isNullable);
	}
	*/

	if (typeof schema === 'boolean') {
		throw new SchemaError('Schema cannot be defined as boolean', path);
	}

	const union = unionInfo(schema);
	const types = schemaTypes(schema, union);

	if (!types.length) {
		//console.warn('No types found', schema);
		return undefined;
	}

	return {
		types: new Set(types.filter((s) => s !== 'null')) as SchemaInfo['types'],
		isOptional,
		isNullable: isSchemaNullable(schema),
		schema,
		union
	};
}

function schemaTypes(schema: JSONSchema7, union: ReturnType<typeof unionInfo>): SchemaType[] {
	let types: SchemaType[] = [];

	if (union.types) types = union.types.flatMap((s) => schemaTypes(s, unionInfo(s)));
	else if (union.type) types = schemaTypes(union.type, unionInfo(union.type));
	else types = [];

	if (schema.type) {
		types = types.concat(Array.isArray(schema.type) ? schema.type : [schema.type]);
	}

	if (types.includes('array') && schema.uniqueItems) {
		const i = types.findIndex((t) => t != 'array');
		types[i] = 'set';
	} else if (schema.format && conversionFormatTypes.includes(schema.format)) {
		types.unshift(schema.format as SchemaType);
	}

	if (types.includes('unix-time')) {
		const i = types.findIndex((t) => t == 'integer');
		types.splice(i, 1);
	}

	return Array.from(new Set(types));
}

export function isSchemaNullable(schema: JSONSchema7) {
	return !!(
		schema.type == 'null' ||
		schema.type?.includes('null') ||
		(schema.anyOf && schema.anyOf.find((s) => typeof s !== 'boolean' && s.type == 'null'))
	);
}
