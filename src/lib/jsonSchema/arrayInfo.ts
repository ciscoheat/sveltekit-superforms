import { SchemaError } from '$lib/index.js';
import type { JSONSchema7Definition } from 'json-schema';
import { schemaInfo, type JSONSchema } from './index.js';

/**
 * A tree structure where the existence of a node means that its not a leaf.
 * Used in error mapping to determine whether to add errors to an _error field
 * (as in arrays and objects), or directly on the field itself.
 */
export type ArrayShape = {
	[K in string]: ArrayShape;
};

export function arrayInfo(schema: JSONSchema, path: string[] = []): ArrayShape {
	if (schema.type !== 'object') {
		throw new SchemaError('Only objects can use errorShape', path);
	}

	// Can be casted since it guaranteed to be an object
	return _arrayInfo(schema, path) as ArrayShape;
}

function _arrayInfo(schema: JSONSchema7Definition, path: string[]): ArrayShape | undefined {
	if (typeof schema === 'boolean') {
		throw new SchemaError('Schema cannot be defined as boolean', path);
	}

	const info = schemaInfo(schema);
	if (!info) return undefined;

	if (info.array || info.union) {
		const arr = info.array || [];
		const union = info.union ? info.union.types : [];
		return arr.concat(union).reduce(
			(shape, next) => {
				const nextShape = _arrayInfo(next, path);
				if (nextShape) shape = { ...(shape ?? {}), ...nextShape };
				return shape;
			},
			arr.length ? {} : undefined
		);
	}

	if (info.properties) {
		const output: ArrayShape = {};
		for (const [key, prop] of Object.entries(info.properties)) {
			const shape = _arrayInfo(prop, [...path, key]);
			if (shape) output[key] = shape;
		}
		return output;
	}

	return undefined;
}
