import type { JSONSchema } from '../../jsonSchema/index.js';
import type { JSONSchema7TypeName } from 'json-schema';

/**
 * Simple JSON Schema generator for validation libraries without introspection.
 */
export function simpleSchema(value: unknown): JSONSchema {
	if (value === null || value === undefined) {
		return {};
	}

	switch (typeof value) {
		case 'object': {
			if (value instanceof Date) {
				return { type: 'integer', format: 'unix-time' };
			}

			if (Array.isArray(value)) {
				const output: JSONSchema = { type: 'array' };
				if (value.length) output.items = simpleSchema(value[0]);
				return output;
			} else {
				const obj = value as Record<string, unknown>;
				return {
					type: 'object',
					properties: Object.fromEntries(
						Object.entries(obj).map(([key, value]) => [key, simpleSchema(value)])
					),
					required: Object.keys(obj).filter(
						(key) =>
							(!obj[key] && obj[key] !== undefined && obj[key] !== null) ||
							(Array.isArray(obj[key]) && !(obj[key] as unknown[]).length)
					),
					additionalProperties: false
				} satisfies JSONSchema;
			}
		}
	}

	return { type: typeof value as JSONSchema7TypeName };
}
