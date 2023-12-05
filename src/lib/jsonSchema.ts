import {
	SchemaError as SchemaError,
	type InputConstraints,
	type InputConstraint
} from '$lib/index.js';
import type { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';
import merge from 'ts-deepmerge';

export type { JSONSchema7 as JSONSchema } from 'json-schema';

type FormatType = 'unix-time' | 'bigint' | 'any' | 'symbol' | 'set';

export type SchemaType = JSONSchema7TypeName | FormatType;

export type SchemaInfo = {
	types: Exclude<SchemaType, 'null'>[];
	isOptional: boolean;
	isNullable: boolean;
	schema: JSONSchema7;
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

function defaultValue(
	type: JSONSchema7TypeName,
	format: string | undefined,
	enumType: unknown[] | undefined
): unknown {
	if (format && conversionFormatTypes.includes(format)) {
		switch (format as FormatType) {
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

export function schemaInfo(
	schema: JSONSchema7,
	isOptional: boolean,
	onUnion?: (schemas: JSONSchema7[], isOptional: boolean) => SchemaInfo
): SchemaInfo {
	if (schema.anyOf) {
		if (!onUnion) throw new SchemaError('Unions (anyOf) not supported without onUnion callback.');
		return onUnion(schema.anyOf.filter((s) => typeof s !== 'boolean') as JSONSchema7[], isOptional);
	}

	const types = schemaTypes(schema);

	if (!types.length) {
		throw new SchemaError('No types found in schema.');
	}

	return {
		types: types.filter((s) => s !== 'null') as SchemaInfo['types'],
		isOptional,
		isNullable: isSchemaNullable(schema),
		schema
	};
}

function schemaTypes(schema: JSONSchema7): SchemaType[] {
	if (schema.anyOf) throw new SchemaError('anyOf is not supported for schemaTypes.');

	let types: SchemaType[] = schema.type
		? Array.isArray(schema.type)
			? schema.type
			: [schema.type]
		: [];

	if (types.includes('array') && schema.uniqueItems) {
		types = types.filter((t) => t != 'array');
		types.unshift('set');
	} else if (schema.format && conversionFormatTypes.includes(schema.format)) {
		types.unshift(schema.format as SchemaType);
	}

	if (types.includes('unix-time')) {
		types = types.filter((t) => t != 'integer');
	}

	return types;
}

function isSchemaNullable(schema: JSONSchema7) {
	return !!(schema.type == 'null' || schema.type?.includes('null'));
}

///// Default values //////////////////////////////////////////////////////////

export function defaultValues<T>(schema: JSONSchema7, isOptional = false, path: string[] = []): T {
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

	if (isSchemaNullable(schema)) return null;
	if (isOptional) return undefined;

	// Unions
	if (schema.anyOf) {
		const singleDefault = schema.anyOf.filter(
			(s) => typeof s !== 'boolean' && s.default !== undefined
		);
		if (singleDefault.length == 0) {
			throw new SchemaError('No default value found for union.', path);
		} else if (singleDefault.length > 1) {
			throw new SchemaError(
				'Only one default value can exist in a union, or set a default value for the whole union.',
				path
			);
		} else if (typeof singleDefault[0] === 'boolean') {
			throw new SchemaError('Schema cannot be defined as boolean.', path);
		}

		return _defaultValues(singleDefault[0], isOptional, path);
	}

	// Objects
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

	// Enums
	if (schema.enum) {
		return schema.enum[0];
	}

	const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
	if (!type) {
		console.log('No type or format for property:', path);
		console.dir(schema, { depth: 10 });
		return undefined;
	}

	return defaultValue(type, schema.format, schema.enum);
}

///// Constraints /////////////////////////////////////////////////////////////

export function constraints<T extends object>(schema: JSONSchema7): InputConstraints<T> {
	if (schema.type != 'object') {
		throw new SchemaError('Constraints must be created from an object schema.');
	}

	return _constraints(schema, false, []);
}

export function _constraints(
	schema: JSONSchema7Definition,
	isOptional: boolean,
	path: string[]
): InputConstraints<object> | InputConstraint | undefined {
	if (typeof schema === 'boolean') {
		throw new SchemaError('Schema cannot be defined as boolean', path);
	}

	// Union
	if (schema.anyOf) {
		if (!schema.anyOf.length) {
			throw new SchemaError('Unions (anyOf) cannot be empty.', path);
		}
		if (schema.anyOf.length > 1) {
			const merged = schema.anyOf
				.map((s) => _constraints(s, isOptional, path))
				.filter((s) => s !== undefined);
			return merge(...merged);
		} else {
			return _constraints(schema.anyOf[0], isOptional, path);
		}
	}

	// Arrays
	if (schema.type == 'array') {
		if (!schema.items || (Array.isArray(schema.items) && !schema.items.length)) {
			throw new SchemaError('Arrays must have an items property', path);
		}

		const items = Array.isArray(schema.items) ? schema.items : [schema.items];
		if (items.length == 1) {
			//console.log('Array constraint', schema, path);
			return _constraints(items[0], isOptional, path);
		}

		try {
			return merge(...items.map((i) => _constraints(i, isOptional, path)));
		} catch (error) {
			if (error instanceof TypeError) {
				console.log('ERROR', schema);
				throw new SchemaError('TypeError');
			}
		}
	}

	// Objects
	if (schema.type == 'object') {
		const output: Record<string, unknown> = {};
		if (schema.properties) {
			for (const [key, prop] of Object.entries(schema.properties)) {
				if (typeof prop == 'boolean') {
					throw new SchemaError('Property cannot be defined as boolean.', [...path, key]);
				}

				const propConstraint = _constraints(prop, !schema.required?.includes(key), [...path, key]);

				if (typeof propConstraint === 'object' && Object.values(propConstraint).length > 0) {
					output[key] = propConstraint;
				}
			}
		}
		return output;
	}

	return constraint(path, schema, isOptional);
}

function constraint(
	path: string[],
	schema: JSONSchema7,
	isOptional: boolean
): InputConstraint | undefined {
	const output: InputConstraint = {};

	const type = schema.type;
	const format = schema.format;
	const nullable = isSchemaNullable(schema);

	// Must be before type check
	if (
		type == 'integer' &&
		format == 'unix-time' //||
		//format == 'date-time' ||
		//format == 'date' ||
		//format == 'time'
	) {
		const date = schema;
		if (date.minimum !== undefined) output.min = new Date(date.minimum).toISOString();
		if (date.maximum !== undefined) output.max = new Date(date.maximum).toISOString();
	} else if (type == 'string') {
		const str = schema;
		const patterns = [
			str.pattern,
			...(str.allOf ? str.allOf.map((s) => (typeof s == 'boolean' ? undefined : s.pattern)) : [])
		].filter((s) => s !== undefined);

		if (patterns.length > 0) output.pattern = patterns[0];
		if (str.minLength !== undefined) output.minlength = str.minLength;
		if (str.maxLength !== undefined) output.maxlength = str.maxLength;
	} else if (type == 'number' || type == 'integer') {
		const num = schema;
		if (num.minimum !== undefined) output.min = num.minimum;
		if (num.maximum !== undefined) output.max = num.maximum;
		if (num.multipleOf !== undefined) output.step = num.multipleOf;
	} else if (type == 'array') {
		const arr = schema;
		if (arr.minItems !== undefined) output.min = arr.minItems;
		if (arr.maxItems !== undefined) output.max = arr.maxItems;
	}

	if (!nullable && !isOptional) {
		output.required = true;
	}

	return Object.keys(output).length > 0 ? output : undefined;
}
