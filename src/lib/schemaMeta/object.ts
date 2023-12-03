import type { SuperValidateOptions } from '$lib/superValidate.js';
import type { JSONSchema7 } from 'json-schema';
import type { SchemaMeta } from './index.js';
import toJsonSchema from 'to-json-schema';
import type { InputConstraints } from '$lib/index.js';
import { constraints } from './jsonSchema.js';

export class ObjectSchemaMeta<T extends object> implements SchemaMeta<T> {
	readonly defaults: T;
	readonly constraints: InputConstraints<T>;
	readonly schema: JSONSchema7;

	constructor(object: T, options?: SuperValidateOptions<T, boolean>) {
		this.defaults = object;
		this.schema = toJsonSchema(object) as JSONSchema7;
		this.constraints = constraints(this.schema, options?.warnings);
	}
}
