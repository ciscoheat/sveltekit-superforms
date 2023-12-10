import { SchemaError as SchemaError } from '$lib/index.js';
import type { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';

export type { JSONSchema7 as JSONSchema } from 'json-schema';

type FormatType = 'unix-time' | 'bigint' | 'any' | 'symbol' | 'set';

export type SchemaType = JSONSchema7TypeName | FormatType;

export type SchemaInfo = {
	types: Exclude<SchemaType, 'null'>[];
	isOptional: boolean;
	isNullable: boolean;
	schema: JSONSchema7;
	union?: JSONSchema7[];
	array?: JSONSchema7[];
	properties?: { [key: string]: JSONSchema7 };
	default?: unknown;
	required?: string[];
};

const conversionFormatTypes = ['unix-time', 'bigint', 'any', 'symbol', 'set'];

function unionInfo(schema: JSONSchema7) {
	if (!schema.anyOf) return undefined;
	return schema.anyOf.filter((s) => typeof s !== 'boolean') as JSONSchema7[];
}

export function schemaInfo(
	schema: JSONSchema7Definition,
	isOptional: boolean,
	path: string[] = []
): SchemaInfo | undefined {
	if (typeof schema === 'boolean') {
		throw new SchemaError('Schema cannot be defined as boolean', path);
	}

	const types = schemaTypes(schema, path);

	if (!types.length) {
		//console.warn('No types found', schema);
		return undefined;
	}

	const array =
		schema.items && types.includes('array')
			? ((Array.isArray(schema.items) ? schema.items : [schema.items]).filter(
					(s) => typeof s !== 'boolean'
			  ) as JSONSchema7[])
			: undefined;

	const properties =
		schema.properties && types.includes('object')
			? (Object.fromEntries(
					Object.entries(schema.properties).filter(([, value]) => typeof value !== 'boolean')
			  ) as { [key: string]: JSONSchema7 })
			: undefined;

	return {
		types: types.filter((s) => s !== 'null') as SchemaInfo['types'],
		isOptional: schema.default !== undefined ? true : isOptional,
		isNullable: types.includes('null'),
		schema,
		union: unionInfo(schema),
		array,
		properties,
		default: schema.default,
		required: schema.required
	};
}

function schemaTypes(schema: JSONSchema7Definition, path: string[]): SchemaType[] {
	if (typeof schema === 'boolean') {
		throw new SchemaError('Schema cannot be defined as boolean', path);
	}

	if (!schema) {
		console.log('null schema?', path);
	}

	let types: SchemaType[] = [];

	if (schema.type) {
		types = Array.isArray(schema.type) ? schema.type : [schema.type];
	} else if (schema.anyOf) {
		types = schema.anyOf.flatMap((s) => schemaTypes(s, path));
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
