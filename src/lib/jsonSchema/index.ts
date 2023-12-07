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

// TODO: Handle conversion better, since it also depends on other props in the schema. (see schemaTypes)
function valueWithFormat(format: string, value: unknown) {
	if (format == 'any') return value;
	if (format == 'set' && Array.isArray(value)) return new Set(value);
	if (typeof value !== 'string' && typeof value !== 'number') return value;

	switch (format) {
		case 'unix-time':
			return new Date(value);
		case 'bigint':
			return BigInt(value);
		case 'symbol':
			return Symbol(value);
		default:
			throw new SchemaError('Format not supported for default string or number value: ' + format);
	}
}

function defaultValue(type: SchemaType, enumType: unknown[] | undefined): unknown {
	switch (type) {
		case 'string':
			return enumType && enumType.length > 0 ? enumType[0] : '';
		case 'number':
		case 'integer':
			return enumType && enumType.length > 0 ? enumType[0] : 0;
		case 'boolean':
			return false;
		case 'array':
			return [];
		case 'object':
			return {};
		case 'null':
			return null;
		case 'unix-time':
			// Cannot add default for Date due to https://github.com/Rich-Harris/devalue/issues/51
			return undefined;
		case 'bigint':
			return BigInt(0);
		case 'set':
			return new Set();
		case 'symbol':
			return Symbol();
		case 'any':
			return undefined;

		default:
			throw new SchemaError(
				'Schema type or format not supported, requires explicit default value: ' + type
			);
	}
}

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

///// Default values //////////////////////////////////////////////////////////

export function defaultValues<T = Record<string, unknown>>(
	schema: JSONSchema7,
	isOptional = false,
	path: string[] = []
): T {
	return _defaultValues(schema, isOptional, path) as T;
}

function _defaultValues(schema: JSONSchema7, isOptional: boolean, path: string[]): unknown {
	if (!schema) {
		throw new SchemaError('Schema was undefined', path);
	}

	//if (schema.type == 'object') console.log('--- OBJECT ---');
	//else console.log(path, schema, { isOptional });

	// Default takes (early) priority.
	if (schema.default !== undefined) {
		// Check if a special format should be used
		if (schema.format && conversionFormatTypes.includes(schema.format)) {
			return valueWithFormat(schema.format, schema.default);
		} else {
			return schema.default;
		}
	}

	const info = schemaInfo(schema, isOptional);
	if (!info) {
		return undefined;
		// TODO: Throw if no default value?
		//throw new SchemaError('No types found for default value', path);
	}

	// Null takes priority over undefined
	if (info.isNullable) return null;
	if (info.isOptional) return undefined;

	// Unions
	if (info.union.types) {
		const singleDefault = info.union.types.filter(
			(s) => typeof s !== 'boolean' && s.default !== undefined
		);
		if (singleDefault.length == 0) {
			throw new SchemaError('No default value found for union.', path);
		} else if (singleDefault.length > 1) {
			throw new SchemaError(
				'Only one default value can exist in a union, or set a default value for the whole union.',
				path
			);
		}

		return _defaultValues(singleDefault[0], isOptional, path);
	} else if (info.union.type) {
		return _defaultValues(info.union.type, isOptional, path);
	}

	// Objects
	if (schema.type == 'object' && schema.properties) {
		const output: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(schema.properties)) {
			if (typeof value == 'boolean') {
				throw new SchemaError('Property cannot be defined as boolean.', [...path, key]);
			}
			const def = _defaultValues(value, !schema.required?.includes(key), [...path, key]);
			// TODO: Remove undefined fields, or set them?
			if (def !== undefined) output[key] = def;
		}
		return output;
	}

	// Enums
	if (schema.enum) {
		return schema.enum[0];
	}

	// Basic type
	if (info.types.size > 1) {
		throw new SchemaError('Default values cannot have more than one type.', path);
	} else if (info.types.size == 0) {
		console.log('No type or format for property:', path);
		console.dir(schema, { depth: 10 });
		return undefined;
	}

	const [formatType] = info.types;

	return defaultValue(formatType, schema.enum);
}
