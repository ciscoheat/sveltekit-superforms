import { SchemaError } from '$lib/errors.js';
import type { JSONSchema7Definition } from 'json-schema';
import { schemaInfo } from './schemaInfo.js';
import type { JSONSchema } from './index.js';

/**
 * A tree structure where the existence of a node means that the field is an array or an object.
 * Used in error mapping to determine whether to add errors to an _error field
 * (as in arrays and objects), or directly on the field itself.
 */
export type SchemaShape = {
	[K in string]: SchemaShape;
};

export function schemaShape(schema: JSONSchema, path: string[] = []): SchemaShape {
	const output = _schemaShape(schema, path);

	if (!output) throw new SchemaError('No shape could be created for schema.', path);
	return output;
}

function _schemaShape(schema: JSONSchema7Definition, path: string[]): SchemaShape | undefined {
	if (typeof schema === 'boolean') {
		throw new SchemaError('Schema cannot be defined as boolean', path);
	}

	const info = schemaInfo(schema, false);

	if (info.array || info.union) {
		const arr = info.array || [];
		const union = info.union || [];
		return arr.concat(union).reduce(
			(shape, next) => {
				const nextShape = _schemaShape(next, path);
				if (nextShape) shape = { ...(shape ?? {}), ...nextShape };
				return shape;
			},
			arr.length ? {} : undefined
		);
	}

	if (info.properties) {
		const output: SchemaShape = {};
		for (const [key, prop] of Object.entries(info.properties)) {
			const shape = _schemaShape(prop, [...path, key]);
			if (shape) output[key] = shape;
		}
		return output;
	}

	return info.types.includes('array') || info.types.includes('object') ? {} : undefined;
}
