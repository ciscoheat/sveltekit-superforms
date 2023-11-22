import type { InputConstraints } from '$lib/index.js';
import type { Schema } from '@decs/typeschema';

export interface SchemaMeta<T extends object, C extends 'with-constraints' | 'no-constraints'> {
	defaults: T;
	constraints: C extends 'with-constraints' ? InputConstraints<T> : never;
}

export function schemaType(schema: Schema): 'zod' | 'other' {
	if ('safeParseAsync' in schema) return 'zod';
	return 'other';
}
