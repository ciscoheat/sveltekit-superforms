import type {
	z,
	ZodTypeAny,
	AnyZodObject,
	ZodNullable,
	ZodOptional,
	ZodEffects,
	ZodPipeline,
	ZodString,
	ZodNumber,
	ZodDate
} from 'zod';

import { valueOrDefault, type SchemaMeta } from './index.js';

import { SuperFormError, type InputConstraints, type InputConstraint } from '$lib/index.js';
import type { SuperValidateOptions } from '$lib/superValidate.js';
import type { JSONSchema7 } from 'json-schema';

type ZodTypeInfo = {
	zodType: ZodTypeAny;
	originalType: ZodTypeAny;
	isNullable: boolean;
	isOptional: boolean;
	hasDefault: boolean;
	effects: ZodEffects<ZodTypeAny> | undefined;
	defaultValue: unknown;
};

type EntityRecord<T extends AnyZodObject, K> = Record<keyof z.infer<T>, K>;

type ZodValidation<T extends AnyZodObject> =
	| T
	| ZodEffects<T>
	| ZodEffects<ZodEffects<T>>
	| ZodEffects<ZodEffects<ZodEffects<T>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>
	| ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>;

export class ZodSchemaMeta<T extends ZodValidation<AnyZodObject>>
	implements SchemaMeta<z.infer<T>, 'with-constraints'>
{
	readonly defaults: z.infer<T>;
	readonly constraints: InputConstraints<z.infer<T>>;
	readonly schema: JSONSchema7;

	constructor(schema: T, options?: SuperValidateOptions<z.infer<T>, false>) {
		while (schema._def.typeName == 'ZodEffects') {
			schema = (schema as ZodEffects<T>)._def.schema;
		}

		if (!(schema._def.typeName == 'ZodObject')) {
			throw new SuperFormError(
				'Only Zod schema objects can be used with defaultValues. ' +
					'Define the schema with z.object({ ... }) and optionally refine/superRefine/transform at the end.'
			);
		}

		this.defaults = defaultValues(schema as AnyZodObject);
		this.constraints = constraints(schema as AnyZodObject, options?.warnings);
	}
}

/**
 * Returns the default values for a zod validation schema.
 * The main gotcha is that undefined values are changed to null if the field is nullable.
 */
function defaultValues<T extends AnyZodObject>(schema: T): z.infer<T> {
	const realSchema = schema as T;
	const fields = Object.keys(realSchema.keyof().Values);
	const schemaTypeInfo = schemaInfo(realSchema);

	return Object.fromEntries(
		fields.map((field) => {
			const typeInfo = schemaTypeInfo[field];
			const newValue = valueOrDefault(field, undefined, true, typeInfo);

			return [field, newValue];
		})
	);
}

function schemaInfo<T extends AnyZodObject>(schema: T) {
	return _mapSchema(schema, (obj) => unwrapZodType(obj));
}

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

function constraints<T extends AnyZodObject>(
	schema: T,
	warnings: SuperValidateOptions<z.infer<T>, false>['warnings']
): InputConstraints<z.infer<T>> {
	function constraint(
		key: string,
		zodType: ZodTypeAny,
		info: ZodTypeInfo
	): InputConstraint | undefined {
		const output: InputConstraint = {};

		if (zodType._def.typeName == 'ZodString') {
			const zodString = zodType as ZodString;
			const patterns = zodString._def.checks.filter((f) => f.kind == 'regex');

			if (patterns.length > 1 && warnings?.multipleRegexps !== false) {
				console.warn(
					`Field "${key}" has more than one regexp, only the first one will be used in constraints. Set the warnings.multipleRegexps option to false to disable this warning.`
				);
			}

			const pattern =
				patterns.length > 0 && patterns[0].kind == 'regex' ? patterns[0].regex.source : undefined;

			if (pattern) output.pattern = pattern;
			if (zodString.minLength !== null) output.minlength = zodString.minLength;
			if (zodString.maxLength !== null) output.maxlength = zodString.maxLength;
		} else if (zodType._def.typeName == 'ZodNumber') {
			const zodNumber = zodType as ZodNumber;
			const steps = zodNumber._def.checks.filter((f) => f.kind == 'multipleOf');

			if (steps.length > 1 && warnings?.multipleSteps !== false) {
				console.warn(
					`Field "${key}" has more than one step, only the first one will be used in constraints. Set the warnings.multipleSteps option to false to disable this warning.`
				);
			}

			const step = steps.length > 0 && steps[0].kind == 'multipleOf' ? steps[0].value : null;

			if (zodNumber.minValue !== null) output.min = zodNumber.minValue;
			if (zodNumber.maxValue !== null) output.max = zodNumber.maxValue;
			if (step !== null) output.step = step;
		} else if (zodType._def.typeName == 'ZodDate') {
			const zodDate = zodType as ZodDate;
			if (zodDate.minDate) output.min = zodDate.minDate.toISOString();
			if (zodDate.maxDate) output.max = zodDate.maxDate.toISOString();
		} else if (zodType._def.typeName == 'ZodArray') {
			if (zodType._def.minLength) output.min = zodType._def.minLength.value;
			if (zodType._def.maxLength) output.max = zodType._def.maxLength.value;
			if (zodType._def.exactLength) output.min = output.max = zodType._def.exactLength.value;
		}

		if (!info.isNullable && !info.isOptional) {
			output.required = true;
		}

		return Object.keys(output).length > 0 ? output : undefined;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function mapField(key: string, value: ZodTypeAny): any {
		const info = unwrapZodType(value);
		value = info.zodType;
		if (value._def.typeName == 'ZodArray') {
			return mapField(key, value._def.type);
		} else if (value._def.typeName == 'ZodObject') {
			return constraints(value as AnyZodObject, warnings);
		} else {
			return constraint(key, value, info);
		}
	}

	return _mapSchema(
		schema,
		(obj, key) => {
			return mapField(key, obj);
		},
		(data) => !!data
	) as InputConstraints<T>;
}

////////////////////////////////////////////////////////////////////

function _mapSchema<T extends AnyZodObject, S>(
	schema: T,
	factory: (obj: AnyZodObject, key: string) => S,
	filter?: (data: S) => boolean
) {
	const keys = schema.keyof().Values;
	return Object.fromEntries(
		Object.keys(keys)
			.map((key) => [key, factory(schema.shape[key], key)] as const)
			.filter((entry) => (filter ? filter(entry[1]) : true))
	) as EntityRecord<T, S>;
}
