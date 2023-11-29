import type { InputConstraints } from '$lib/index.js';
import type { Schema } from '@decs/typeschema';
import type { JSONSchema7 } from 'json-schema';

export type SchemaMeta<T extends object> = {
	defaults: T;
	constraints: InputConstraints<T>;
	schema: JSONSchema7;
};

export function schemaType(schema: Schema): 'zod' | 'other' {
	if ('safeParseAsync' in schema) return 'zod';
	return 'other';
}
