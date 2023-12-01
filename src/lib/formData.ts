import { SuperFormError, SchemaError } from './index.js';
import type { SuperValidateOptions } from './superValidate.js';
import { parse } from 'devalue';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { defaultValues, isNullable, schemaTypes } from './schemaMeta/jsonSchema.js';

type ParsedData = {
	id: string | undefined;
	posted: boolean;
	data: Record<string, unknown> | undefined;
};

type ParseOptions<T extends object> = {
	preprocessed: SuperValidateOptions<T, boolean>['preprocessed'];
};

export async function parseRequest<T extends object>(
	data: unknown,
	schemaData: JSONSchema7,
	options: ParseOptions<T>
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
	options: ParseOptions<T>
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
	options?: { preprocessed: SuperValidateOptions<T, boolean>['preprocessed'] }
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

export function parseFormData<T extends object>(
	formData: FormData,
	schemaData: JSONSchema7,
	options?: { preprocessed: SuperValidateOptions<T, boolean>['preprocessed'] }
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
	schema: JSONSchema7,
	preprocessed?: (keyof T)[]
) {
	const output: Record<string, unknown> = {};
	const schemaKeys = schema.additionalProperties
		? formData.keys()
		: Object.keys(schema.properties ?? {});

	function parseSingleEntry(key: string, entry: FormDataEntryValue, property: JSONSchema7) {
		if (preprocessed && preprocessed.includes(key as keyof T)) {
			return entry;
		}

		if (entry && typeof entry !== 'string') {
			// File object, not supported
			// TODO: Add a warning for uploaded files that can be disabled?
			return undefined;
		}

		return parseFormDataEntry(key, entry, !schema.required?.includes(key), property);
	}

	for (const key of schemaKeys) {
		const property: JSONSchema7Definition = schema.properties
			? schema.properties[key]
			: { type: 'string' };

		if (typeof property == 'boolean') {
			throw new SchemaError('Schema properties defined as boolean is not supported.', key);
		}

		const entries = formData.getAll(key);

		if (property.type != 'array') {
			output[key] = parseSingleEntry(key, entries[entries.length - 1], property);
		} else {
			const items = property.items;
			if (!items || typeof items == 'boolean') {
				throw new SchemaError('Arrays must have an "items" property that defines its type.', key);
			}

			const arrayType = Array.isArray(items) ? items[0] : items;
			if (typeof arrayType == 'boolean') {
				throw new SchemaError('Schema properties defined as boolean is not supported.', key);
			}
			output[key] = entries.map((e) => parseSingleEntry(key, e, arrayType));
		}
	}

	return output;
}

function parseFormDataEntry(
	key: string,
	value: string | null,
	isOptional: boolean,
	schema: JSONSchema7Definition
): unknown {
	if (typeof schema == 'boolean') {
		throw new SchemaError('An object property cannot be defined as boolean.', key);
	}

	const newValue = valueOrDefault(key, value, false, isOptional, schema);
	const types = schemaTypes(schema);
	const type = types?.[0];

	console.log(`Parsing FormData "${key}" (${type}): ${value}`, schema);

	// If the value was empty, newValue contains the default value
	// so it can be returned immediately, unless it's boolean, which
	// means it could have been posted as a checkbox.
	if (!value && type != 'boolean') {
		return newValue;
	}

	switch (type) {
		case 'string':
			return value;
		case 'integer':
			return parseInt(value ?? '', 10);
		case 'number':
			return parseFloat(value ?? '');
		case 'boolean':
			return Boolean(value == 'false' ? '' : value).valueOf();
		case 'unix-time':
			return new Date(value ?? '');
		case 'array': {
			const arrayType = schema.items;
			if (typeof arrayType == 'boolean') {
				throw new SchemaError('Arrays cannot be defined as boolean.', key);
			}
			if (!arrayType) {
				throw new SchemaError('Arrays must have an "items" property.', key);
			}
			return parseFormDataEntry(
				key,
				value,
				isOptional,
				Array.isArray(arrayType) ? arrayType[0] : arrayType
			);
		}
		case 'bigint':
			return BigInt(value ?? '.');
		case 'symbol':
			return Symbol(String(value));
		case 'any':
		case 'null':
		case 'set':
			return value;
		case 'object': {
			throw new SuperFormError(
				`Object found in form field "${key}". ` +
					`Set the dataType option to "json" and add use:enhance on the client to use nested data structures. ` +
					`More information: https://superforms.rocks/concepts/nested-data`
			);
		}
		default:
			throw new SuperFormError('Unsupported default FormData type: ' + type);
	}

	// TODO: Enum parsing
	/*
	} else if (type == 'NativeEnum') {
		const zodEnum = zodType as ZodNativeEnum<EnumLike>;

		if (value !== null && value in zodEnum.enum) {
			const enumValue = zodEnum.enum[value];
			if (typeof enumValue === 'number') return enumValue;
			else if (enumValue in zodEnum.enum) return zodEnum.enum[enumValue];
		} else if (value !== null && Object.values(zodEnum.enum).includes(value)) {
			return value;
		}
		return undefined;
	} 
	*/
}

/**
 * Based on schema type, check what the empty value should be parsed to
 *
 * Nullable takes priority over optional.
 * Also make a check for strict, so empty strings from FormData can also be set here.
 *
 * @param value
 * @param strict
 * @param schema
 * @param isOptional
 * @returns
 */
function valueOrDefault(
	key: string,
	value: unknown,
	strict: boolean,
	isOptional: boolean,
	schema: JSONSchema7
) {
	if (value) return value;
	if (strict && value !== undefined) return value;

	const defaultValue = defaultValues(schema, isOptional, [key]);

	if (defaultValue !== undefined) return defaultValue;
	if (isNullable(schema)) return null;
	if (isOptional) return undefined;

	throw new SchemaError('Required field without default value found.', key);
}
