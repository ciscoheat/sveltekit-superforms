import type { InputConstraints } from '$lib/index.js';
import type { Schema } from '@decs/typeschema';
import type { JSONSchema7 } from 'json-schema';

export interface SchemaMeta<T extends object, C extends 'with-constraints' | 'no-constraints'> {
	defaults: T;
	constraints: C extends 'with-constraints' ? InputConstraints<T> : never;
	schema: JSONSchema7;
}

export function schemaType(schema: Schema): 'zod' | 'other' {
	if ('safeParseAsync' in schema) return 'zod';
	return 'other';
}
