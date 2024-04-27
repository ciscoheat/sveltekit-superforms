import type { SuperStruct } from '$lib/superStruct.js';
import type { JSONSchema } from './index.js';
import { schemaInfo, type SchemaInfo } from './schemaInfo.js';
import { merge as deepMerge } from 'ts-deepmerge';

export type InputConstraint = Partial<{
	pattern: string; // RegExp
	min: number | string; // Date
	max: number | string; // Date
	required: boolean;
	step: number | 'any';
	minlength: number;
	maxlength: number;
}>;

export type InputConstraints<T> = SuperStruct<T, InputConstraint>;

export function constraints<T>(schema: JSONSchema): InputConstraints<T> {
	return _constraints(schemaInfo(schema, false, []), []) as InputConstraints<T>;
}

function merge<T>(
	...constraints: (InputConstraints<T> | InputConstraint | undefined)[]
): ReturnType<typeof _constraints> {
	const filtered = constraints.filter((c) => !!c);
	if (!filtered.length) return undefined;
	if (filtered.length == 1) return filtered[0];
	return deepMerge(...(filtered as Record<string, unknown>[]));
}

function _constraints<T>(
	info: SchemaInfo | undefined,
	path: string[]
): InputConstraints<T> | InputConstraint | undefined {
	if (!info) return undefined;

	let output: Record<string, unknown> | undefined = undefined;

	// Union
	if (info.union && info.union.length) {
		const infos = info.union.map((s) => schemaInfo(s, info.isOptional, path));
		const merged = infos.map((i) => _constraints(i, path));
		output = merge(output, ...merged);

		// Delete required if any part of the union is optional
		if (
			output &&
			(info.isNullable || info.isOptional || infos.some((i) => i?.isNullable || i?.isOptional))
		) {
			delete output.required;
		}
	}

	// Arrays
	if (info.array) {
		output = merge(
			output,
			...info.array.map((i) => _constraints(schemaInfo(i, info.isOptional, path), path))
		);
	}

	// Objects
	if (info.properties) {
		const obj = {} as Record<string, unknown>;
		for (const [key, prop] of Object.entries(info.properties)) {
			const propInfo = schemaInfo(
				prop,
				!info.required?.includes(key) || prop.default !== undefined,
				[key]
			);
			const propConstraint = _constraints(propInfo, [...path, key]);

			if (typeof propConstraint === 'object' && Object.values(propConstraint).length > 0) {
				obj[key] = propConstraint;
			}
		}
		output = merge(output, obj);
	}

	return output ?? constraint(info);
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
