import { SchemaError } from '$lib/index.js';
import type { JSONSchema7Definition } from 'json-schema';
import { isSchemaNullable, schemaInfo, type JSONSchema } from './index.js';
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

	const info = schemaInfo(schema);
	if (!info) return undefined;

	// Union
	if (info.union) {
		if (info.union.types.length > 1) {
			// TODO: Simpler merge of constraints?
			const merged = info.union.types
				.map((s) => _constraints(s, isOptional, path))
				.filter((s) => s !== undefined);
			return merge(...merged);
		} else {
			return _constraints(info.union.types[0], isOptional, path);
		}
	}

	// Arrays
	if (info.array) {
		if (info.array.length == 1) {
			//console.log('Array constraint', schema, path);
			return _constraints(info.array[0], isOptional, path);
		}

		return merge(...info.array.map((i) => _constraints(i, isOptional, path)));
	}

	// Objects
	if (info.properties) {
		const output: Record<string, unknown> = {};
		for (const [key, prop] of Object.entries(info.properties)) {
			const propConstraint = _constraints(prop, !schema.required?.includes(key), [...path, key]);

			if (typeof propConstraint === 'object' && Object.values(propConstraint).length > 0) {
				output[key] = propConstraint;
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
