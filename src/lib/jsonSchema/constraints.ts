import { SchemaError } from '$lib/index.js';
import { schemaInfo, type JSONSchema, type SchemaInfo } from './index.js';
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

	return _constraints(schemaInfo(schema, false), []);
}

function _constraints(
	info: SchemaInfo | undefined,
	path: string[]
): InputConstraints<object> | InputConstraint | undefined {
	if (!info) return undefined;

	// Union
	if (info.union) {
		// TODO: Simpler merge of constraints?
		const infos = info.union.map((s) => schemaInfo(s, info.isOptional, path));
		const merged = infos.map((i) => _constraints(i, path)).filter((s) => s !== undefined);
		const output = merged.length > 1 ? merge(...merged) : merged[0];
		// Delete required if any part of the union is optional
		if (
			output &&
			(info.isNullable || info.isOptional || infos.some((i) => i?.isNullable || i?.isOptional))
		) {
			delete output.required;
		}
		return output && Object.values(output).length ? output : undefined;
	}

	// Arrays
	if (info.array) {
		if (info.array.length == 1) {
			//console.log('Array constraint', schema, path);
			return _constraints(schemaInfo(info.array[0], info.isOptional), path);
		}

		return merge(...info.array.map((i) => _constraints(schemaInfo(i, info.isOptional), path)));
	}

	// Objects
	if (info.properties) {
		const output: Record<string, unknown> = {};
		for (const [key, prop] of Object.entries(info.properties)) {
			const propInfo = schemaInfo(
				prop,
				!info.required?.includes(key) || prop.default !== undefined
			);
			const propConstraint = _constraints(propInfo, [...path, key]);

			if (typeof propConstraint === 'object' && Object.values(propConstraint).length > 0) {
				output[key] = propConstraint;
			}
		}
		return output;
	}

	return constraint(info, path);
}

function constraint(info: SchemaInfo, path: string[]): InputConstraint | undefined {
	const output: InputConstraint = {};
	const schema = info.schema;

	const type = schema.type;
	const format = schema.format;

	/*
	if (path[0] == 'nullableString') {
		console.log(path, schema, info.isOptional, info.isNullable);
	}
	*/

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
		else if (num.exclusiveMinimum !== undefined)
			output.min = num.exclusiveMinimum + (type == 'integer' ? 1 : Number.MIN_VALUE);

		if (num.maximum !== undefined) output.max = num.maximum;
		else if (num.exclusiveMaximum !== undefined)
			output.max = num.exclusiveMaximum - (type == 'integer' ? 1 : Number.MIN_VALUE);

		if (num.multipleOf !== undefined) output.step = num.multipleOf;
	} else if (type == 'array') {
		const arr = schema;
		if (arr.minItems !== undefined) output.min = arr.minItems;
		if (arr.maxItems !== undefined) output.max = arr.maxItems;
	}

	if (!info.isNullable && !info.isOptional) {
		output.required = true;
	}

	return Object.keys(output).length > 0 ? output : undefined;
}
