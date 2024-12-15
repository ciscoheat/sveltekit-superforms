import { SchemaError } from '$lib/errors.js';
import { assertSchema } from '$lib/utils.js';
import { merge } from 'ts-deepmerge';
import type { JSONSchema } from './index.js';
import { schemaInfo } from './schemaInfo.js';
import type { SchemaType } from './schemaInfo.js';

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

	const info = schemaInfo(schema, isOptional, path);
	if (!info) return undefined;

	//if (schema.type == 'object') console.log('--- OBJECT ---');
	//else console.dir({ path, schema, isOptional }, { depth: 10 });

	let objectDefaults: Record<string, unknown> | undefined = undefined;

	// Default takes (early) priority.
	if ('default' in schema) {
		// Test for object defaults.
		// Cannot be returned directly, since undefined fields
		// may have to be replaced with correct default values.
		if (
			info.types.includes('object') &&
			schema.default &&
			typeof schema.default == 'object' &&
			!Array.isArray(schema.default)
		) {
			objectDefaults = schema.default as Record<string, unknown>;
		} else {
			if (info.types.length > 1) {
				if (
					info.types.includes('unix-time') &&
					(info.types.includes('integer') || info.types.includes('number'))
				)
					throw new SchemaError(
						'Cannot resolve a default value with a union that includes a date and a number/integer.',
						path
					);
			}

			const [type] = info.types;
			return formatDefaultValue(type, schema.default);
		}
	}

	let _multiType: Set<string>;
	const isMultiTypeUnion = () => {
		if (!info.union || info.union.length < 2) return false;
		if (info.union.some((i) => i.enum)) return true;

		if (!_multiType) {
			_multiType = new Set(
				info.types.map((i) => {
					return ['integer', 'unix-time'].includes(i) ? 'number' : i;
				})
			);
		}
		return _multiType.size > 1;
	};

	let output: Record<string, unknown> | undefined = undefined;

	// Check unions first, so default values can take precedence over nullable and optional
	if (!objectDefaults && info.union) {
		const singleDefault = info.union.filter(
			(s) => typeof s !== 'boolean' && s.default !== undefined
		);
		if (singleDefault.length == 1) {
			return _defaultValues(singleDefault[0], isOptional, path);
		} else if (singleDefault.length > 1) {
			throw new SchemaError(
				'Only one default value can exist in a union, or set a default value for the whole union.',
				path
			);
		} else {
			// Null takes priority over undefined
			if (info.isNullable) return null;
			if (info.isOptional) return undefined;

			if (isMultiTypeUnion()) {
				throw new SchemaError(
					'Multi-type unions must have a default value, or exactly one of the union types must have.',
					path
				);
			}

			// Objects must have default values to avoid setting undefined properties on nested data
			if (info.union.length && info.types[0] == 'object') {
				if (output === undefined) output = {};
				output =
					info.union.length > 1
						? merge.withOptions(
								{ allowUndefinedOverrides: true },
								...info.union.map(
									(s) => _defaultValues(s, isOptional, path) as Record<string, unknown>
								)
							)
						: (_defaultValues(info.union[0], isOptional, path) as Record<string, unknown>);
			}
		}
	}

	if (!objectDefaults) {
		// Null takes priority over undefined
		if (info.isNullable) return null;
		if (info.isOptional) return undefined;
	}

	// Objects
	if (info.properties) {
		for (const [key, objSchema] of Object.entries(info.properties)) {
			assertSchema(objSchema, [...path, key]);

			const def =
				objectDefaults && objectDefaults[key] !== undefined
					? objectDefaults[key]
					: _defaultValues(objSchema, !info.required?.includes(key), [...path, key]);

			//if (def !== undefined) output[key] = def;
			if (output === undefined) output = {};
			output[key] = def;
		}
	} else if (objectDefaults) {
		return objectDefaults;
	}

	// TODO: [v3] Handle default values for array elements
	// if (info.array && info.array.length) {
	// 	console.log('===== Array default =====');
	// 	console.dir(info.array, { depth: 10 }); //debug
	// 	//if (info.array.length > 1) throw new SchemaError('Only one array type is supported.', path);
	// 	console.dir(_defaultValues(info.array[0], info.isOptional, path), { depth: 10 }); //debug
	// }

	// Enums, return the first value so it can be a required field
	if (schema.enum) {
		return schema.enum[0];
	}

	// Basic type
	if (isMultiTypeUnion()) {
		throw new SchemaError('Default values cannot have more than one type.', path);
	} else if (info.types.length == 0) {
		//console.warn('No type or format for property:', path); //debug
		//console.dir(schema, { depth: 10 }); //debug
		return undefined;
	}

	const [formatType] = info.types;

	return output ?? defaultValue(formatType, schema.enum);
}

function formatDefaultValue(type: SchemaType, value: unknown) {
	switch (type) {
		case 'set':
			return Array.isArray(value) ? new Set(value) : value;
		case 'Date':
		case 'date':
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

export function defaultValue(type: SchemaType, enumType: unknown[] | undefined): unknown {
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
		case 'Date':
		case 'date':
		case 'unix-time':
			// Cannot add default for Date due to https://github.com/Rich-Harris/devalue/issues/51
			return undefined;
		case 'int64':
		case 'bigint':
			return BigInt(0);
		case 'set':
			return new Set();
		case 'symbol':
			return Symbol();
		case 'undefined':
		case 'any':
			return undefined;

		default:
			throw new SchemaError(
				'Schema type or format not supported, requires explicit default value: ' + type
			);
	}
}

////////////////////////////////////////////////////////////////////////////

export function defaultTypes(schema: JSONSchema, path: string[] = []) {
	return _defaultTypes(schema, false, path);
}

export type SchemaFieldType = {
	__types: (SchemaType | 'null' | 'undefined')[];
	__items?: SchemaTypeObject;
};
type SchemaTypeObject = {
	[Key in Exclude<string, '_types' | '_items'>]: SchemaTypeObject;
} & SchemaFieldType;

function _defaultTypes(schema: JSONSchema, isOptional: boolean, path: string[]) {
	if (!schema) {
		throw new SchemaError('Schema was undefined', path);
	}

	const info = schemaInfo(schema, isOptional, path);

	const output = {
		__types: info.types
	} as SchemaTypeObject;

	//if (schema.type == 'object') console.log('--- OBJECT ---'); //debug
	//else console.dir({ path, info }, { depth: 10 }); //debug

	// schema.items cannot be an array according to
	// https://www.learnjsonschema.com/2020-12/applicator/items/
	if (
		info.schema.items &&
		typeof info.schema.items == 'object' &&
		!Array.isArray(info.schema.items)
	) {
		output.__items = _defaultTypes(info.schema.items, info.isOptional, path);
	}

	if (info.properties) {
		for (const [key, value] of Object.entries(info.properties)) {
			assertSchema(value, [...path, key]);

			output[key] = _defaultTypes(info.properties[key], !info.required?.includes(key), [
				...path,
				key
			]);
		}
	}

	// Check if a Record type is used for additionalProperties
	if (info.additionalProperties && info.types.includes('object')) {
		const additionalInfo = schemaInfo(info.additionalProperties, info.isOptional, path);
		if (additionalInfo.properties && additionalInfo.types.includes('object')) {
			for (const [key] of Object.entries(additionalInfo.properties)) {
				output[key] = _defaultTypes(
					additionalInfo.properties[key],
					!additionalInfo.required?.includes(key),
					[...path, key]
				);
			}
		}
	}

	if (info.isNullable && !output.__types.includes('null')) {
		output.__types.push('null');
	}

	if (info.isOptional && !output.__types.includes('undefined')) {
		output.__types.push('undefined');
	}

	return output;
}
