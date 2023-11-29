import type { z, AnyZodObject, ZodEffects } from 'zod';
import type { InputConstraints } from '$lib/index.js';
import type { SuperValidateOptions } from '$lib/superValidate.js';
import type { JSONSchema7 } from 'json-schema';
import type { SchemaMeta } from './index.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { constraints, defaultValues } from './jsonSchema.js';

type ZodValidation<T extends AnyZodObject> =
	| T
	| ZodEffects<T>
	| ZodEffects<ZodEffects<T>>
	| ZodEffects<ZodEffects<ZodEffects<T>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>;

export class ZodSchemaMeta<T extends ZodValidation<AnyZodObject>>
	implements SchemaMeta<z.infer<T>>
{
	readonly defaults: z.infer<T>;
	readonly constraints: InputConstraints<z.infer<T>>;
	readonly schema: JSONSchema7;

	constructor(schema: T, options?: SuperValidateOptions<z.infer<T>, false>) {
		this.schema = zodToJsonSchema(schema, { dateStrategy: 'integer' }) as JSONSchema7;
		this.defaults = defaultValues(this.schema);
		this.constraints = constraints(this.schema, options?.warnings);
	}
}

/*
type ZodTypeInfo = {
	zodType: ZodTypeAny;
	originalType: ZodTypeAny;
	isNullable: boolean;
	isOptional: boolean;
	hasDefault: boolean;
	effects: ZodEffects<ZodTypeAny> | undefined;
	defaultValue: unknown;
};

function unwrapZodType(zodType: ZodTypeAny): ZodTypeInfo {
	const originalType = zodType;

	let _wrapped = true;
	let isNullable = false;
	let isOptional = false;
	let hasDefault = false;
	let effects = undefined;
	let defaultValue: unknown = undefined;

	//let i = 0;
	while (_wrapped) {
		//console.log(' '.repeat(++i * 2) + zodType.constructor.name);
		if (zodType._def.typeName == 'ZodNullable') {
			isNullable = true;
			zodType = (zodType as ZodNullable<ZodTypeAny>).unwrap();
		} else if (zodType._def.typeName == 'ZodDefault') {
			hasDefault = true;
			defaultValue = zodType._def.defaultValue();
			zodType = zodType._def.innerType;
		} else if (zodType._def.typeName == 'ZodOptional') {
			isOptional = true;
			zodType = (zodType as ZodOptional<ZodTypeAny>).unwrap();
		} else if (zodType._def.typeName == 'ZodEffects') {
			if (!effects) effects = zodType as ZodEffects<ZodTypeAny>;
			zodType = zodType._def.schema;
		} else if (zodType._def.typeName == 'ZodPipeline') {
			zodType = (zodType as ZodPipeline<ZodTypeAny, ZodTypeAny>)._def.out;
		} else {
			_wrapped = false;
		}
	}

	return {
		zodType,
		originalType,
		isNullable,
		isOptional,
		hasDefault,
		defaultValue,
		effects
	};
}
*/
