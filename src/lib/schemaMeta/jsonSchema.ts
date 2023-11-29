import {
	SuperFormSchemaError as SchemaError,
	type InputConstraints,
	type InputConstraint
} from '$lib/index.js';
import type { SuperValidateOptions } from '$lib/superValidate.js';
import type { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';
import merge from 'ts-deepmerge';

//type FormatType = 'unix-time' | 'bigint' | 'any' | 'symbol' | 'set';
//type PropertyType = JSONSchema7TypeName | FormatType;

const conversionFormatTypes = ['unix-time', 'bigint', 'any', 'symbol', 'set'];

function defaultValueToFormat(format: string, value: unknown) {
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
		switch (format) {
			case 'date':
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

function nullableSchema(schema: JSONSchema7) {
	return !!(schema.type == 'null' || schema.type?.includes('null'));
}

///// Default values //////////////////////////////////////////////////////////

export function defaultValues<T>(schema: JSONSchema7): T {
	return _defaultValues(schema, false, []) as T;
}

function _defaultValues(schema: JSONSchema7, isOptional: boolean, path: string[]): unknown {
	//if (schema.type == 'object') console.log('OBJECT');
	//else console.log(path, schema, { isOptional });

	// Default takes (early) priority.
	if (schema.default !== undefined) {
		// Check if a special format should be used
		if (schema.format && conversionFormatTypes.includes(schema.format)) {
			return defaultValueToFormat(schema.format, schema.default);
		} else {
			return schema.default;
		}
	}

	if (nullableSchema(schema)) return null;
	if (isOptional) return undefined;

	// Unions
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

	const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
	if (!type) {
		console.log('No type or format', path);
		console.dir(schema, { depth: 10 });
		//throw new SchemaError('No type or format for schema.', path);
		return undefined;
	}

	return defaultValue(type, schema.format, schema.enum);
}

///// Constraints /////////////////////////////////////////////////////////////

export function constraints<T extends object>(
	schema: JSONSchema7,
	warnings?: SuperValidateOptions<T, boolean>['warnings']
): InputConstraints<T> {
	if (schema.type != 'object') {
		throw new SchemaError('Constraints must be created from an object schema.');
	}

	return _constraints(schema, false, warnings, []);
}

export function _constraints(
	schema: JSONSchema7Definition,
	isOptional: boolean,
	warnings: SuperValidateOptions<object, boolean>['warnings'] | undefined,
	path: string[]
): InputConstraints<object> | InputConstraint | undefined {
	if (typeof schema === 'boolean') {
		throw new SchemaError('Schema cannot be defined as boolean', path);
	}

	// Union
	if (schema.anyOf) {
		const merged = schema.anyOf
			.map((s) => _constraints(s, isOptional, warnings, path))
			.filter((s) => s !== undefined);
		return merge(...merged);
	}

	// Arrays
	if (schema.type == 'array') {
		if (!schema.items) {
			throw new SchemaError('Arrays must have an items property', path);
		}
		const items = Array.isArray(schema.items) ? schema.items : [schema.items];
		return merge(...items.map((i) => _constraints(i, isOptional, warnings, path)));
	}

	// Objects
	if (schema.type == 'object') {
		const output: Record<string, unknown> = {};
		if (schema.properties) {
			for (const [key, prop] of Object.entries(schema.properties)) {
				if (typeof prop == 'boolean') {
					throw new SchemaError('Property cannot be defined as boolean.', [...path, key]);
				}

				const propConstraint = _constraints(prop, !schema.required?.includes(key), warnings, [
					...path,
					key
				]);

				if (typeof propConstraint === 'object' && Object.values(propConstraint).length > 0) {
					output[key] = propConstraint;
				}
			}
		}
		return output;
	}

	return constraint(path, schema, isOptional, warnings?.multipleRegexps);
}

function constraint(
	path: string[],
	schema: JSONSchema7,
	isOptional: boolean,
	multipleRegexpsWarning: boolean | undefined
): InputConstraint | undefined {
	const output: InputConstraint = {};

	const type = schema.type;
	const format = schema.format;
	const isNullable = nullableSchema(schema);

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

		if (patterns.length > 1 && multipleRegexpsWarning !== false) {
			console.warn(
				`Field "${path.join(
					'.'
				)}" has more than one regexp, only the first one will be used in constraints. Set the warnings.multipleRegexps option to false to disable this warning.`
			);
		}

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

	if (!isNullable && !isOptional) {
		output.required = true;
	}

	return Object.keys(output).length > 0 ? output : undefined;
}
