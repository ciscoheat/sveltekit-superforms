import type { SuperStruct } from '$lib/superStruct.js';
import { schemaInfo, type JSONSchema, type SchemaInfo } from './index.js';

export type InputConstraint = Partial<{
	pattern: string; // RegExp
	min: number | string; // Date
	max: number | string; // Date
	required: boolean;
	step: number | 'any';
	minlength: number;
	maxlength: number;
}>;

export type InputConstraints<T extends Record<string, unknown>> = SuperStruct<T, InputConstraint>;

export function constraints<T extends Record<string, unknown>>(
	schema: JSONSchema
): InputConstraints<T> {
	return _constraints(schemaInfo(schema, false), []) as InputConstraints<T>;
}

function merge<T extends Record<string, unknown>>(
	constraints: (InputConstraints<T> | InputConstraint | undefined)[]
): ReturnType<typeof _constraints> {
	let output = {};
	for (const constraint of constraints) {
		if (!constraint) continue;
		output = { ...output, ...constraint };
	}
	return output;
}

function _constraints<T extends Record<string, unknown>>(
	info: SchemaInfo | undefined,
	path: string[]
): InputConstraints<T> | InputConstraint | undefined {
	if (!info) return undefined;

	// Union
	if (info.union) {
		const infos = info.union.map((s) => schemaInfo(s, info.isOptional, path));
		const merged = infos.map((i) => _constraints(i, path));
		const output = merge(merged);
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

		return merge(info.array.map((i) => _constraints(schemaInfo(i, info.isOptional), path)));
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

	return constraint(info);
}

function constraint(info: SchemaInfo): InputConstraint | undefined {
	const output: InputConstraint = {};
	const schema = info.schema;

	const type = schema.type;
	const format = schema.format;

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
