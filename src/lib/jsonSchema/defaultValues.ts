import { SchemaError } from '$lib/index.js';
import { schemaInfo, type JSONSchema, type SchemaType } from './index.js';

export function defaultValues<T = Record<string, unknown>>(
	schema: JSONSchema,
	isOptional = false,
	path: string[] = []
): T {
	return _defaultValues(schema, isOptional, path) as T;
}

function _defaultValues(schema: JSONSchema, isOptional: boolean, path: string[]): unknown {
	if (!schema) {
		throw new SchemaError('Schema was undefined', path);
	}

	const info = schemaInfo(schema, isOptional);
	if (!info) return undefined;

	//if (schema.type == 'object') console.log('--- OBJECT ---');
	//else console.log(path, schema, { isOptional });

	// Default takes (early) priority.
	if (schema.default !== undefined) {
		// TODO: Handle multiple default types by using the first one?
		// Otherwise, format conversion is problematic.
		const [type] = info.types;
		return formatDefaultValue(type, schema.default);
	}

	// Null takes priority over undefined
	if (info.isNullable) return null;
	if (info.isOptional) return undefined;

	// Unions
	if (info.union) {
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
	}

	// Objects
	if (info.properties) {
		const output: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(info.properties)) {
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

// TODO: Handle conversion better, since it also depends on other props in the schema. (see schemaTypes)
function formatDefaultValue(type: SchemaType, value: unknown) {
	switch (type) {
		case 'set':
			return Array.isArray(value) ? new Set(value) : value;
		case 'unix-time':
			if (typeof value === 'string' || typeof value === 'number') return new Date(value);
			break;
		case 'bigint':
			if (typeof value === 'string' || typeof value === 'number') return BigInt(value);
			break;
		case 'symbol':
			if (typeof value === 'string' || typeof value === 'number') return Symbol(value);
			break;
	}

	return value;
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
