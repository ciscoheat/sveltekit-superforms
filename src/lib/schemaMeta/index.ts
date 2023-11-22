import type { Schema } from '@decs/typeschema';

export interface SchemaMeta<T extends object> {
	defaults: T;
}

export function schemaType(schema: Schema): 'zod' | 'other' {
	if ('safeParseAsync' in schema) return 'zod';
	return 'other';
}
