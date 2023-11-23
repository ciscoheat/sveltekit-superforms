import type {
	AnyZodObject,
	EnumLike,
	ZodEffects,
	ZodLiteral,
	ZodNativeEnum,
	ZodNullable,
	ZodNumber,
	ZodOptional,
	ZodPipeline,
	ZodTypeAny
} from 'zod';
import { SuperFormError, type InputConstraints, type ErrorShape } from './index.js';
import type { SuperValidateOptions } from './superValidate.js';
import { parse, stringify } from 'devalue';
import type { z } from 'zod';
import { valueOrDefault } from './schemaMeta/zod.js';

type EntityRecord<T extends AnyZodObject, K> = Record<keyof z.infer<T>, K>;

type Entity<T extends AnyZodObject> = {
	typeInfo: EntityRecord<T, ZodTypeInfo>;
	defaultEntity: z.infer<T>;
	constraints: InputConstraints<T>;
	keys: string[];
	hash: string;
	errorShape: ErrorShape;
};

type ZodTypeInfo = {
	zodType: ZodTypeAny;
	originalType: ZodTypeAny;
	isNullable: boolean;
	isOptional: boolean;
	hasDefault: boolean;
	effects: ZodEffects<ZodTypeAny> | undefined;
	defaultValue: unknown;
};

type SchemaData<T extends AnyZodObject> = {
	originalSchema: ZodValidation<T>;
	unwrappedSchema: T;
	hasEffects: boolean;
	entityInfo: Entity<T>;
	schemaKeys: string[];
	opts: SuperValidateOptions<T>;
};

type ParsedData = {
	id: string | undefined;
	posted: boolean;
	data: Record<string, unknown> | null | undefined;
};

export async function parseRequest(
	data: unknown,
	schemaData: SchemaData<AnyZodObject>,
	options: SuperValidateOptions
) {
	let parsed: ParsedData;

	if (data instanceof FormData) {
		parsed = parseFormData(data, schemaData, options);
	} else if (data instanceof URL || data instanceof URLSearchParams) {
		parsed = parseSearchParams(data, schemaData, options);
	} else if (data instanceof Request) {
		parsed = await tryParseFormData(data, schemaData, options);
	} else if (
		data &&
		typeof data === 'object' &&
		'request' in data &&
		data.request instanceof Request
	) {
		parsed = await tryParseFormData(data.request, schemaData, options);
	} else {
		parsed = {
			id: undefined,
			data: data as Record<string, unknown>,
			posted: false
		};
	}

	//////////////////////////////////////////////////////////////////////
	// This logic is shared between superValidate and superValidateSync //
	const toValidate = dataToValidate(parsed, schemaData);
	const result = toValidate
		? await schemaData.originalSchema.safeParseAsync(toValidate)
		: undefined;
	//////////////////////////////////////////////////////////////////////

	return { parsed, result };
}

/**
 * Check what data to validate. If no parsed data, the default entity
 * may still have to be validated if there are side-effects or errors
 * should be displayed.
 */
function dataToValidate<T extends AnyZodObject>(
	parsed: ParsedData,
	schemaData: SchemaData<T>
): Record<string, unknown> | undefined {
	if (!parsed.data) {
		return schemaData.hasEffects || schemaData.opts.errors === true
			? schemaData.entityInfo.defaultEntity
			: undefined;
	} else {
		return parsed.data;
	}
}

async function tryParseFormData<T extends AnyZodObject>(
	request: Request,
	schemaData: SchemaData<T>,
	options: SuperValidateOptions
) {
	let formData: FormData | undefined = undefined;
	try {
		formData = await request.formData();
	} catch (e) {
		if (e instanceof TypeError && e.message.includes('already been consumed')) {
			// Pass through the "body already consumed" error, which applies to
			// POST requests when event/request is used after formData has been fetched.
			throw e;
		}
		// No data found, return an empty form
		return { id: undefined, data: undefined, posted: false };
	}
	return parseFormData(formData, schemaData, options);
}

function parseFormData<T extends AnyZodObject>(
	formData: FormData,
	schemaData: SchemaData<T>,
	options?: SuperValidateOptions
): ParsedData {
	function tryParseSuperJson() {
		if (formData.has('__superform_json')) {
			try {
				const output = parse(formData.getAll('__superform_json').join('') ?? '');
				if (typeof output === 'object') {
					return output as z.infer<UnwrapEffects<T>>;
				}
			} catch {
				//
			}
		}
		return null;
	}

	const data = tryParseSuperJson();
	const id = formData.get('__superform_id')?.toString() ?? undefined;

	return data
		? { id, data, posted: true }
		: {
				id,
				data: formDataToValidation(formData, schemaData, options?.preprocessed),
				posted: true
		  };
}

function parseSearchParams<T extends AnyZodObject>(
	data: URL | URLSearchParams,
	schemaData: SchemaData<T>,
	options?: SuperValidateOptions
): ParsedData {
	if (data instanceof URL) data = data.searchParams;

	const convert = new FormData();
	for (const [key, value] of data.entries()) {
		convert.append(key, value);
	}

	// Only FormData can be posted.
	const output = parseFormData(convert, schemaData, options);
	output.posted = false;
	return output;
}

function formDataToValidation<T extends AnyZodObject>(
	data: FormData,
	schemaData: SchemaData<T>,
	preprocessed?: (keyof z.infer<T>)[]
) {
	const output: Record<string, unknown> = {};
	const { schemaKeys, entityInfo } = schemaData;

	function parseSingleEntry(key: string, entry: FormDataEntryValue, typeInfo: ZodTypeInfo) {
		if (preprocessed && preprocessed.includes(key)) {
			return entry;
		}

		if (entry && typeof entry !== 'string') {
			// File object, not supported
			return undefined;
		}

		return parseFormDataEntry(key, entry, typeInfo);
	}

	for (const key of schemaKeys) {
		const typeInfo = entityInfo.typeInfo[key];
		const entries = data.getAll(key);

		if (!(typeInfo.zodType._def.typeName == 'ZodArray')) {
			output[key] = parseSingleEntry(key, entries[0], typeInfo);
		} else {
			const arrayType = unwrapZodType(typeInfo.zodType._def.type);
			output[key] = entries.map((e) => parseSingleEntry(key, e, arrayType));
		}
	}

	function parseFormDataEntry(field: string, value: string | null, typeInfo: ZodTypeInfo): unknown {
		const newValue = valueOrDefault(value, false, typeInfo);
		const zodType = typeInfo.zodType;

		// If the value was empty, it now contains the default value,
		// so it can be returned immediately, unless it's boolean, which
		// means it could have been posted as a checkbox.
		if (!value && zodType._def.typeName != 'ZodBoolean') {
			return newValue;
		}

		//console.log(`FormData field "${field}" (${zodType._def.typeName}): ${value}`

		if (zodType._def.typeName == 'ZodString') {
			return value;
		} else if (zodType._def.typeName == 'ZodNumber') {
			return (zodType as ZodNumber).isInt ? parseInt(value ?? '', 10) : parseFloat(value ?? '');
		} else if (zodType._def.typeName == 'ZodBoolean') {
			return Boolean(value == 'false' ? '' : value).valueOf();
		} else if (zodType._def.typeName == 'ZodDate') {
			return new Date(value ?? '');
		} else if (zodType._def.typeName == 'ZodArray') {
			const arrayType = unwrapZodType(zodType._def.type);
			return parseFormDataEntry(field, value, arrayType);
		} else if (zodType._def.typeName == 'ZodBigInt') {
			try {
				return BigInt(value ?? '.');
			} catch {
				return NaN;
			}
		} else if (zodType._def.typeName == 'ZodLiteral') {
			const literalType = typeof (zodType as ZodLiteral<unknown>).value;

			if (literalType === 'string') return value;
			else if (literalType === 'number') return parseFloat(value ?? '');
			else if (literalType === 'boolean') return Boolean(value).valueOf();
			else {
				throw new SuperFormError('Unsupported ZodLiteral type: ' + literalType);
			}
		} else if (
			zodType._def.typeName == 'ZodUnion' ||
			zodType._def.typeName == 'ZodEnum' ||
			zodType._def.typeName == 'ZodAny'
		) {
			return value;
		} else if (zodType._def.typeName == 'ZodNativeEnum') {
			const zodEnum = zodType as ZodNativeEnum<EnumLike>;

			if (value !== null && value in zodEnum.enum) {
				const enumValue = zodEnum.enum[value];
				if (typeof enumValue === 'number') return enumValue;
				else if (enumValue in zodEnum.enum) return zodEnum.enum[enumValue];
			} else if (value !== null && Object.values(zodEnum.enum).includes(value)) {
				return value;
			}
			return undefined;
		} else if (zodType._def.typeName == 'ZodSymbol') {
			return Symbol(String(value));
		}

		if (zodType._def.typeName == 'ZodObject') {
			throw new SuperFormError(
				`Object found in form field "${field}". ` +
					`Set the dataType option to "json" and add use:enhance on the client to use nested data structures. ` +
					`More information: https://superforms.rocks/concepts/nested-data`
			);
		}

		throw new SuperFormError('Unsupported Zod default type: ' + zodType.constructor.name);
	}

	return output as z.infer<T>;
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
