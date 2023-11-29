import { SuperFormSchemaError as SchemaError } from '$lib/index.js';
import type { JSONSchema7, JSONSchema7TypeName } from 'json-schema';

//type FormatType = 'date-time' | 'bigint' | 'any' | 'symbol' | 'set';
//type PropertyType = JSONSchema7TypeName | FormatType;

const conversionFormatTypes = ['date-time', 'bigint', 'any', 'symbol', 'set'];

function defaultValueToFormat(format: string, value: unknown) {
	if (format == 'any') return value;
	if (format == 'set' && Array.isArray(value)) return new Set(value);
	if (typeof value !== 'string' && typeof value !== 'number') return value;

	switch (format) {
		case 'date-time':
			return new Date(value);
		case 'bigint':
			return BigInt(value);
		case 'symbol':
			return Symbol(value);
		default:
			throw new SchemaError('Format not supported for default string or number value: ' + format);
	}
}

function defaultValue(
	type: JSONSchema7TypeName,
	format: string | undefined,
	enumType: unknown[] | undefined
): unknown {
	if (format && conversionFormatTypes.includes(format)) {
		switch (format) {
			case 'date-time':
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
		}
	}

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
		default:
			throw new SchemaError(
				'Schema type or format not supported, requires explicit default value: ' + type
			);
	}
}

/*
function types(schema: JSONSchema7): PropertyType[] | null {
	if (schema.format && formatTypes.includes(schema.format)) {
		return [schema.format as FormatType];
	}

	if (!schema.type) return null;
	return Array.isArray(schema.type) ? schema.type : [schema.type];
}
*/

export function defaultValues<T>(schema: JSONSchema7): T {
	return _defaultValues(schema, false, []) as T;
}

function _defaultValues(schema: JSONSchema7, isOptional: boolean, path: string[]): unknown {
	if (schema.type == 'object') console.log('OBJECT');
	else console.log(path, schema, { isOptional });

	// Default takes (early) priority.
	if (schema.default !== undefined) {
		// Check if a special format should be used
		if (schema.format && conversionFormatTypes.includes(schema.format)) {
			return defaultValueToFormat(schema.format, schema.default);
		} else {
			return schema.default;
		}
	}

	const isNullable = schema.type == 'null' || schema.type?.includes('null');

	if (isNullable) return null;
	if (isOptional) return undefined;

	if (schema.anyOf) {
		for (const type of schema.anyOf) {
			if (typeof type == 'boolean') {
				throw new SchemaError('Schema cannot be defined as boolean.', path);
			}
			const defaultValue = _defaultValues(type, isOptional, path);
			if (defaultValue !== undefined) return defaultValue;
		}
		throw new SchemaError('No default value found for union.', path);
	}

	if (schema.type == 'object' && schema.properties) {
		const output: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(schema.properties)) {
			if (typeof value == 'boolean') {
				throw new SchemaError('Property cannot be defined as boolean.', [...path, key]);
			}
			output[key] = _defaultValues(value, !schema.required?.includes(key), [...path, key]);
		}
		return output;
	}

	const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
	if (!type) {
		console.log('No type or format', path);
		console.dir(schema, { depth: 10 });
		//throw new SchemaError('No type or format for schema.', path);
		return undefined;
	}

	return defaultValue(type, schema.format, schema.enum);
}
