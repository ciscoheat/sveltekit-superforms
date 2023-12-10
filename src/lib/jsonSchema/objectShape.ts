import { SchemaError } from '$lib/index.js';
import type { JSONSchema7Definition } from 'json-schema';
import { schemaInfo, type JSONSchema } from './index.js';

/**
 * A tree structure where the existence of a node means that its not a leaf.
 * Used in error mapping to determine whether to add errors to an _error field
 * (as in arrays and objects), or directly on the field itself.
 */
export type ObjectShape = {
	[K in string]: ObjectShape;
};

export function objectShape(schema: JSONSchema, path: string[] = []): ObjectShape {
	if (schema.type !== 'object') {
		throw new SchemaError('Only objects can use errorShape', path);
	}

	// Can be casted since it guaranteed to be an object
	return _objectShape(schema, path) as ObjectShape;
}

function _objectShape(schema: JSONSchema7Definition, path: string[]): ObjectShape | undefined {
	if (typeof schema === 'boolean') {
		throw new SchemaError('Schema cannot be defined as boolean', path);
	}

	const info = schemaInfo(schema, false);
	if (!info) return undefined;

	if (info.array || info.union) {
		const arr = info.array || [];
		const union = info.union || [];
		return arr.concat(union).reduce(
			(shape, next) => {
				const nextShape = _objectShape(next, path);
				if (nextShape) shape = { ...(shape ?? {}), ...nextShape };
				return shape;
			},
			arr.length ? {} : undefined
		);
	}

	if (info.properties) {
		const output: ObjectShape = {};
		for (const [key, prop] of Object.entries(info.properties)) {
			const shape = _objectShape(prop, [...path, key]);
			if (shape) output[key] = shape;
		}
		return output;
	}

	return undefined;
}
