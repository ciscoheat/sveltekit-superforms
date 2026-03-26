import { assertSchema } from '$lib/utils.js';
import type { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';
import { merge } from 'ts-deepmerge';

export type SchemaType =
	| JSONSchema7TypeName
	| 'Date'
	| 'date'
	| 'unix-time'
	| 'bigint'
	| 'int64'
	| 'any'
	| 'symbol'
	| 'set'
	| 'map'
	| 'null'
	| 'undefined'
	| 'stringbool';

export type SchemaInfo = {
	types: Exclude<SchemaType, 'null'>[];
	isOptional: boolean;
	isNullable: boolean;
	schema: JSONSchema7;
	union?: JSONSchema7[];
	array?: JSONSchema7[];
	properties?: { [key: string]: JSONSchema7 };
	additionalProperties?: { [key: string]: JSONSchema7 };
	required?: string[];
};

const conversionFormatTypes = [
	'unix-time',
	'bigint',
	'any',
	'symbol',
	'set',
	'map',
	'int64',
	'stringbool'
];

/**
 * Normalizes the different kind of schema variations (anyOf, oneOf, union, const null, etc)
 * to figure out the field type, optional, nullable, etc.
 */
export function schemaInfo(
	schema: JSONSchema7Definition,
	isOptional: boolean,
	path: (string | number | symbol)[]
): SchemaInfo {
	assertSchema(schema, path);

	const types = schemaTypes(schema, path);

	const array =
		schema.items && types.includes('array')
			? ((Array.isArray(schema.items) ? schema.items : [schema.items]).filter(
					(s) => typeof s !== 'boolean'
				) as JSONSchema7[])
			: undefined;

	const additionalProperties =
		schema.additionalProperties &&
		typeof schema.additionalProperties === 'object' &&
		types.includes('object')
			? (Object.fromEntries(
					Object.entries(schema.additionalProperties).filter(
						([, value]) => typeof value !== 'boolean'
					)
				) as { [key: string]: JSONSchema7 })
			: undefined;

	const properties =
		schema.properties && types.includes('object')
			? (Object.fromEntries(
					Object.entries(schema.properties).filter(([, value]) => typeof value !== 'boolean')
				) as { [key: string]: JSONSchema7 })
			: undefined;

	const union = unionInfo(schema)?.filter((u) => u.type !== 'null' && u.const !== null);

	const result: SchemaInfo = {
		types: types.filter((s) => s !== 'null') as SchemaInfo['types'],
		isOptional,
		isNullable: types.includes('null'),
		schema,
		union: union?.length ? union : undefined,
		array,
		properties,
		additionalProperties,
		required: schema.required
	};

	if (!schema.allOf || !schema.allOf.length) {
		return result;
	}

	return {
		...merge.withOptions(
			{ allowUndefinedOverrides: false },
			result,
			...schema.allOf.map((s) => schemaInfo(s, false, []))
		),
		schema
	};
}

function schemaTypes(
	schema: JSONSchema7Definition,
	path: (string | number | symbol)[]
): SchemaType[] {
	assertSchema(schema, path);

	let types: SchemaType[] = schema.const === null ? ['null'] : [];

	if (schema.type) {
		types = Array.isArray(schema.type) ? schema.type : [schema.type];
	}

	if (schema.anyOf) {
		types = schema.anyOf.flatMap((s) => schemaTypes(s, path));
	}
	if (schema.oneOf) {
		types = schema.oneOf.flatMap((s) => schemaTypes(s, path));
	}

	if (types.includes('array') && schema.uniqueItems) {
		const i = types.findIndex((t) => t === 'array');
		if (i !== -1) types[i] = 'set';
	} else if (schema.format && conversionFormatTypes.includes(schema.format)) {
		types.unshift(schema.format as SchemaType);

		// For dates and int64 (bigint), remove the integer type, as the schema format will be used
		// instead in the following cases
		if (schema.format == 'unix-time' || schema.format == 'int64') {
			const i = types.findIndex((t) => t == 'integer');
			types.splice(i, 1);
		}

		// For bigint, remove the string type, as the schema format will be used
		// instead in the following cases
		if (schema.format == 'bigint') {
			const i = types.findIndex((t) => t == 'string');
			types.splice(i, 1);
		}

		// For stringbool, remove the string type, as the schema format will be used
		// stringbool should be treated as a special string that validates to boolean
		if (schema.format == 'stringbool') {
			const i = types.findIndex((t) => t == 'string');
			if (i !== -1) types.splice(i, 1);
		}
	}

	if (schema.const && schema.const !== null && typeof schema.const !== 'function') {
		types.push(typeof schema.const as SchemaType);
	}

	return Array.from(new Set(types));
}

function unionInfo(schema: JSONSchema7) {
	if (!schema.oneOf && !schema.anyOf) return undefined;
	if (schema.oneOf && schema.oneOf.length) {
		return schema.oneOf.filter((s) => typeof s !== 'boolean') as JSONSchema7[];
	}
	if (schema.anyOf && schema.anyOf.length) {
		return schema.anyOf.filter((s) => typeof s !== 'boolean') as JSONSchema7[];
	}
	return undefined;
}
