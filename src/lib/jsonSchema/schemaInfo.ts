import { SchemaError } from '$lib/errors.js';
import type { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';

export type SchemaType =
	| JSONSchema7TypeName
	| 'Date'
	| 'date'
	| 'unix-time'
	| 'bigint'
	| 'any'
	| 'symbol'
	| 'set'
	| 'null'
	| 'undefined';

export type SchemaInfo = {
	types: Exclude<SchemaType, 'null'>[];
	isOptional: boolean;
	isNullable: boolean;
	schema: JSONSchema7;
	union?: JSONSchema7[];
	array?: JSONSchema7[];
	properties?: { [key: string]: JSONSchema7 };
	required?: string[];
};

const conversionFormatTypes = ['unix-time', 'bigint', 'any', 'symbol', 'set'];

export function schemaInfo(
	schema: JSONSchema7Definition,
	isOptional: boolean,
	path: (string | number | symbol)[]
): SchemaInfo {
	if (typeof schema === 'boolean') {
		throw new SchemaError('Schema cannot be defined as boolean', path);
	}

	if (!path) throw new SchemaError('Why?', path);

	const types = schemaTypes(schema, path);

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

	const union = unionInfo(schema)?.filter((u) => u.type !== 'null');

	return {
		types: types.filter((s) => s !== 'null') as SchemaInfo['types'],
		isOptional,
		isNullable: types.includes('null'),
		schema,
		union: union?.length ? union : undefined,
		array,
		properties,
		required: schema.required
	};
}

function schemaTypes(
	schema: JSONSchema7Definition,
	path: (string | number | symbol)[]
): SchemaType[] {
	if (typeof schema === 'boolean') {
		throw new SchemaError('Schema cannot be defined as boolean', path);
	}

	let types: SchemaType[] = [];

	if (schema.type) {
		types = Array.isArray(schema.type) ? schema.type : [schema.type];
	}

	if (schema.anyOf) {
		types = schema.anyOf.flatMap((s) => schemaTypes(s, path));
	}

	if (types.includes('array') && schema.uniqueItems) {
		const i = types.findIndex((t) => t != 'array');
		types[i] = 'set';
	} else if (schema.format && conversionFormatTypes.includes(schema.format)) {
		types.unshift(schema.format as SchemaType);

		if (schema.format == 'unix-time') {
			const i = types.findIndex((t) => t == 'integer');
			types.splice(i, 1);
		}
	}

	return Array.from(new Set(types));
}

function unionInfo(schema: JSONSchema7) {
	if (!schema.anyOf || !schema.anyOf.length) return undefined;
	return schema.anyOf.filter((s) => typeof s !== 'boolean') as JSONSchema7[];
}
