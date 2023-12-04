import Ajv from 'ajv';
import type { SchemaObject } from 'ajv';
import type { JSONSchema7 } from '$lib/jsonSchema.js';
import addFormats from 'ajv-formats';

import { validationAdapter } from './index.js';
import type { Inferred } from '$lib/index.js';

// TODO: Use json-schema-to-ts? Seems to have performance issues in VS Code
export function ajv<const T extends JSONSchema7>(schema: T) {
	let validation: SchemaObject;

	if (!compilationCache.has(schema)) {
		const ajv = new Ajv.default({ allErrors: true });
		// @ts-expect-error No type info exists
		addFormats(ajv);
		validation = ajv.compile(schema);
		compilationCache.set(schema, validation);
	} else {
		validation = compilationCache.get(schema)!;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return validationAdapter<Inferred<T>, 'ajv'>(
		'ajv',
		schema,
		() => ({ jsonSchema: schema as JSONSchema7 }),
		[schema],
		async (data) => {
			// @ts-expect-error No type information
			if (validation(data)) {
				return {
					data,
					success: true
				};
			}
			return {
				issues: (validation.errors ?? []).map(
					({ message, instancePath }: { message?: string; instancePath?: string }) => ({
						message: message ?? '',
						path: (instancePath ?? '/').slice(1).split('/')
					})
				),
				success: false
			};
		}
	);
}

const compilationCache = new WeakMap<JSONSchema7, SchemaObject>();
