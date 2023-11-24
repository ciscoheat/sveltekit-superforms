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
import { SuperFormError } from './index.js';
import type { SuperValidateOptions } from './superValidate.js';
import { parse, stringify } from 'devalue';
import type { SchemaProperty } from './schemaMeta/index.js';
import { valueOrDefault } from './schemaMeta/index.js';
import type { JSONSchema7 } from 'json-schema';

type ParsedData = {
	id: string | undefined;
	posted: boolean;
	data: Record<string, unknown> | null | undefined;
};

export async function parseRequest<T extends object>(
	data: unknown,
	schemaData: JSONSchema7,
	options: SuperValidateOptions<T, boolean>
) {
	let parsed: ParsedData;

	if (data instanceof FormData) {
		parsed = parseFormData(data, schemaData, options);
	} else if (data instanceof URL || data instanceof URLSearchParams) {
		parsed = parseSearchParams(data, schemaData, options);
	} else if (data instanceof Request) {
		parsed = await tryParseFormData(data, schemaData, options);
	} else if (
		// RequestEvent
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

	return parsed;
}

/**
 * Check what data to validate. If no parsed data, the default entity
 * may still have to be validated if there are side-effects or errors
 * should be displayed.
 */
/*
function dataToValidate<T extends AnyZodObject>(
	parsed: ParsedData,
	schemaData: JSONSchema7
): Record<string, unknown> | undefined {
	if (!parsed.data) {
		return schemaData.hasEffects || schemaData.opts.errors === true
			? schemaData.entityInfo.defaultEntity
			: undefined;
	} else {
		return parsed.data;
	}
}
*/

async function tryParseFormData<T extends object>(
	request: Request,
	schemaData: JSONSchema7,
	options: SuperValidateOptions<T, boolean>
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

function parseSearchParams<T extends object>(
	data: URL | URLSearchParams,
	schemaData: JSONSchema7,
	options?: SuperValidateOptions<T, boolean>
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

function parseFormData<T extends object>(
	formData: FormData,
	schemaData: JSONSchema7,
	options?: SuperValidateOptions<T, boolean>
): ParsedData {
	function tryParseSuperJson() {
		if (formData.has('__superform_json')) {
			try {
				const output = parse(formData.getAll('__superform_json').join('') ?? '');
				if (typeof output === 'object') {
					return output as Record<string, unknown>;
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
				data: _parseFormData(formData, schemaData, options?.preprocessed),
				posted: true
		  };
}

function _parseFormData<T extends object>(
	formData: FormData,
	schemaData: JSONSchema7,
	preprocessed?: (keyof T)[]
) {
	const output: Record<string, unknown> = {};
	const schemaKeys = Object.keys(schemaData.properties ?? {});

	function parseSingleEntry(key: string, entry: FormDataEntryValue, typeInfo: JSONSchema7) {
		if (preprocessed && preprocessed.includes(key as keyof T)) {
			return entry;
		}

		if (entry && typeof entry !== 'string') {
			// File object, not supported
			return undefined;
		}

		return parseFormDataEntry(key, entry, typeInfo);
	}

	for (const key of schemaKeys) {
		const typeInfo = schemaData.properties![key];
		const entries = formData.getAll(key);

		if (typeof typeInfo == 'boolean')
			throw new SuperFormError(
				'Schema properties defined as boolean is not supported. Field: ' + key
			);

		if (typeInfo.type != 'array') {
			output[key] = parseSingleEntry(key, entries[0], typeInfo);
		} else {
			if (!typeInfo.items || typeof typeInfo.items == 'boolean') {
				throw new SuperFormError(
					'Array must have an items property that defines its type. Key:' + key
				);
			}
			if (Array.isArray(typeInfo.items)) {
				throw new SuperFormError('Items property cannot have multiple values. Key:' + key);
			}

			const arrayType = typeInfo.items;
			output[key] = entries.map((e) => parseSingleEntry(key, e, arrayType));
		}
	}

	function parseFormDataEntry(field: string, value: string | null, typeInfo: JSONSchema7): unknown {
		const newValue = valueOrDefault(field, value, false, typeInfo);
		const property = typeInfo.properties?.[field];
		if (typeof property == 'boolean')
			throw new SuperFormError('An object property cannot be defined as boolean. Key: ' + field);

		const type = property.type;

		// If the value was empty, it now contains the default value,
		// so it can be returned immediately, unless it's boolean, which
		// means it could have been posted as a checkbox.
		if (!value && type != 'ZodBoolean') {
			return newValue;
		}

		//console.log(`FormData field "${field}" (${type}): ${value}`

		if (type == 'ZodString') {
			return value;
		} else if (type == 'ZodNumber') {
			return (zodType as ZodNumber).isInt ? parseInt(value ?? '', 10) : parseFloat(value ?? '');
		} else if (type == 'ZodBoolean') {
			return Boolean(value == 'false' ? '' : value).valueOf();
		} else if (type == 'ZodDate') {
			return new Date(value ?? '');
		} else if (type == 'ZodArray') {
			const arrayType = unwrapZodType(zodType._def.type);
			return parseFormDataEntry(field, value, arrayType);
		} else if (type == 'ZodBigInt') {
			try {
				return BigInt(value ?? '.');
			} catch {
				return NaN;
			}
		} else if (type == 'ZodLiteral') {
			const literalType = typeof (zodType as ZodLiteral<unknown>).value;

			if (literalType === 'string') return value;
			else if (literalType === 'number') return parseFloat(value ?? '');
			else if (literalType === 'boolean') return Boolean(value).valueOf();
			else {
				throw new SuperFormError('Unsupported ZodLiteral type: ' + literalType);
			}
		} else if (type == 'ZodUnion' || type == 'ZodEnum' || type == 'ZodAny') {
			return value;
		} else if (type == 'ZodNativeEnum') {
			const zodEnum = zodType as ZodNativeEnum<EnumLike>;

			if (value !== null && value in zodEnum.enum) {
				const enumValue = zodEnum.enum[value];
				if (typeof enumValue === 'number') return enumValue;
				else if (enumValue in zodEnum.enum) return zodEnum.enum[enumValue];
			} else if (value !== null && Object.values(zodEnum.enum).includes(value)) {
				return value;
			}
			return undefined;
		} else if (type == 'ZodSymbol') {
			return Symbol(String(value));
		}

		if (type == 'ZodObject') {
			throw new SuperFormError(
				`Object found in form field "${field}". ` +
					`Set the dataType option to "json" and add use:enhance on the client to use nested data structures. ` +
					`More information: https://superforms.rocks/concepts/nested-data`
			);
		}

		throw new SuperFormError('Unsupported Zod default type: ' + zodType.constructor.name);
	}

	return output;
}

function unwrapZodType(zodType: ZodTypeAny): SchemaProperty {
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
