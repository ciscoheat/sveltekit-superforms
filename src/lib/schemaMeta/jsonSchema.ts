import { SuperFormSchemaError as SchemaError } from '$lib/index.js';
import type { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';

type FormatType = 'date-time' | 'bigint' | 'any' | 'symbol' | 'set';
type PropertyType = JSONSchema7TypeName | FormatType;

type PropertyInfo = {
	isNullable: boolean;
	isOptional: boolean;
	defaultValue: unknown;
};

const formatTypes = ['date-time', 'bigint', 'any', 'symbol', 'set'];

function defaultValue(types: PropertyType[]) {
	if (types.length == 0) return undefined;

	switch (types[0]) {
		case 'string':
			return '';
		case 'number':
		case 'integer':
			return 0;
		case 'boolean':
			return false;
		case 'array':
			return [];
		case 'object':
			return {};
		case 'null':
			return null;
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
		default:
			throw new SchemaError('Type not supported, requires explicit default value: ' + types[0]);
	}
}

function types(schema: JSONSchema7): PropertyType[] | null {
	if (schema.format && formatTypes.includes(schema.format)) {
		return [schema.format as FormatType];
	}

	if (!schema.type) return null;
	return Array.isArray(schema.type) ? schema.type : [schema.type];
}

function propInfo(property: string, schema: JSONSchema7Definition, path: string[]): PropertyInfo {
	if (typeof schema == 'boolean') {
		throw new SchemaError('Schema cannot be set to boolean.', [...path, property]);
	}
	if (!schema.properties || !(property in schema.properties)) {
		throw new SchemaError('Property not found in schema.', [...path, property]);
	}
	const prop = schema.properties[property];
	if (typeof prop == 'boolean') {
		throw new SchemaError('Property cannot be set to boolean.', [...path, property]);
	}
	return {
		isNullable: !!prop.type?.includes('null'),
		isOptional: !schema.required?.includes(property),
		defaultValue: prop.default
	};
}

export function defaultValues(schema: JSONSchema7) {
	return _defaultValues(schema, []);
}

function _defaultValues(schema: JSONSchema7, path: string[], type?: PropertyType[]) {
	if (!schema.properties) {
		if (schema.default !== undefined) return schema.default;
		else {
			const propTypes = type ?? types(schema);
			return propTypes ? defaultValue(propTypes) : undefined;
		}
	}

	const output: Record<string, unknown> = {};
	for (const [key, property] of Object.entries(schema.properties)) {
		const newPath = [...path, key];

		if (typeof property == 'boolean') {
			throw new SchemaError('Property cannot be set to boolean.', newPath);
		}

		const type = types(property);
		if (!type) continue;

		const info = propInfo(key, schema, newPath);

		if (info.isNullable) output[key] = null;
		else if (info.isOptional) output[key] = undefined;
		else output[key] = _defaultValues(property, newPath, type);
	}
	return output;
}
