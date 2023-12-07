import { SchemaError } from '$lib/index.js';
import type { JSONSchema7Definition } from 'json-schema';
import { isSchemaNullable, type JSONSchema } from './index.js';
import merge from 'ts-deepmerge';

export type InputConstraint = Partial<{
	pattern: string; // RegExp
	min: number | string; // Date
	max: number | string; // Date
	required: boolean;
	step: number | 'any';
	minlength: number;
	maxlength: number;
}>;

export type InputConstraints<T extends object> = SuperStruct<T, InputConstraint>;

export function constraints<T extends object>(schema: JSONSchema): InputConstraints<T> {
	if (schema.type != 'object') {
		throw new SchemaError('Constraints must be created from an object schema.');
	}

	return _constraints(schema, false, []);
}

function _constraints(
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
			// TODO: Simpler merge of constraints?
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
	schema: JSONSchema,
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
