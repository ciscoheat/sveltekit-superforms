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

function isSchemaNullable(schema: JSONSchema7) {
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

	//const info = schemaInfo(schema)

	// Union
	if (schema.anyOf && schema.anyOf.length) {
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
