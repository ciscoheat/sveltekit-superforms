import { SuperFormError, SchemaError } from './errors.js';
import type { SuperValidateOptions } from './superValidate.js';
import { parse } from 'devalue';
import type { JSONSchema7Definition } from 'json-schema';
import { schemaInfo, type SchemaInfo, type SchemaType } from './jsonSchema/schemaInfo.js';
import { defaultValues } from './jsonSchema/schemaDefaults.js';
import type { JSONSchema } from './index.js';
import { setPaths } from './traversal.js';
import { splitPath } from './stringPath.js';
import { assertSchema } from './utils.js';

/**
 * V1 compatibilty. resetForm = false and taintedMessage = true
 */
let legacyMode = false;

try {
	// @ts-expect-error Vite define check
	if (SUPERFORMS_LEGACY) legacyMode = true;
} catch {
	// No legacy mode defined
}

type ParsedData = {
	id: string | undefined;
	posted: boolean;
	data: Record<string, unknown> | null | undefined;
};

const unionError =
	'FormData parsing failed: Unions are only supported when the dataType option for superForm is set to "json".';

export async function parseRequest<T extends Record<string, unknown>>(
	data: unknown,
	schemaData: JSONSchema,
	options?: SuperValidateOptions<T>
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
			data: data as ParsedData['data'],
			posted: false
		};
	}

	return parsed;
}

async function tryParseFormData<T extends Record<string, unknown>>(
	request: Request,
	schemaData: JSONSchema,
	options?: SuperValidateOptions<T>
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

export function parseSearchParams<T extends Record<string, unknown>>(
	data: URL | URLSearchParams,
	schemaData: JSONSchema,
	options?: SuperValidateOptions<T>
): ParsedData {
	if (data instanceof URL) data = data.searchParams;

	const convert = new FormData();
	for (const [key, value] of data.entries()) {
		convert.append(key, value);
	}

	const output = parseFormData(convert, schemaData, options);

	// Set posted to false since it's a URL
	output.posted = false;
	return output;
}

export function parseFormData<T extends Record<string, unknown>>(
	formData: FormData,
	schemaData: JSONSchema,
	options?: SuperValidateOptions<T>
): ParsedData {
	function tryParseSuperJson() {
		if (formData.has('__superform_json')) {
			try {
				const transport =
					options && options.transport
						? Object.fromEntries(Object.entries(options.transport).map(([k, v]) => [k, v.decode]))
						: undefined;

				const output = parse(formData.getAll('__superform_json').join('') ?? '', transport);
				if (typeof output === 'object') {
					// Restore uploaded files and add to data
					const filePaths = Array.from(formData.keys());

					for (const path of filePaths.filter((path) => path.startsWith('__superform_file_'))) {
						const realPath = splitPath(path.substring(17));
						setPaths(output, [realPath], formData.get(path));
					}

					for (const path of filePaths.filter((path) => path.startsWith('__superform_files_'))) {
						const realPath = splitPath(path.substring(18));
						const allFiles = formData.getAll(path);

						setPaths(output, [realPath], Array.from(allFiles));
					}

					return output as Record<string, unknown>;
				}
			} catch {
				//
			}
		}
		return null;
	}

	const data = tryParseSuperJson();
	const id = formData.get('__superform_id')?.toString();

	return data
		? { id, data, posted: true }
		: {
				id,
				data: _parseFormData(formData, schemaData, options),
				posted: true
			};
}

function _parseFormData<T extends Record<string, unknown>>(
	formData: FormData,
	schema: JSONSchema,
	options?: SuperValidateOptions<T>
) {
	const output: Record<string, unknown> = {};

	let schemaKeys: Set<string>;

	if (options?.strict) {
		schemaKeys = new Set([...formData.keys()].filter((key) => !key.startsWith('__superform_')));
	} else {
		let unionKeys: string[] = [];

		// Special fix for union schemas, then the keys must be gathered from the objects in the union
		if (schema.anyOf) {
			const info = schemaInfo(schema, false, []);
			if (info.union?.some((s) => s.type !== 'object')) {
				throw new SchemaError('All form types must be an object if schema is a union.');
			}

			unionKeys = info.union?.flatMap((s) => Object.keys(s.properties ?? {})) ?? [];
		}

		schemaKeys = new Set(
			[
				...unionKeys,
				...Object.keys(schema.properties ?? {}),
				...(schema.additionalProperties ? formData.keys() : [])
			].filter((key) => !key.startsWith('__superform_'))
		);
	}

	function parseSingleEntry(key: string, entry: FormDataEntryValue, info: SchemaInfo) {
		if (options?.preprocessed && options.preprocessed.includes(key as keyof T)) {
			return entry;
		}

		if (entry && typeof entry !== 'string') {
			const allowFiles = legacyMode ? options?.allowFiles === true : options?.allowFiles !== false;
			return !allowFiles ? undefined : entry.size ? entry : info.isNullable ? null : undefined;
		}

		if (info.types.length > 1) {
			throw new SchemaError(unionError, key);
		}

		const [type] = info.types;
		return parseFormDataEntry(key, entry, type ?? 'any', info);
	}

	const defaultPropertyType =
		typeof schema.additionalProperties == 'object'
			? schema.additionalProperties
			: ({ type: 'string' } as const);

	for (const key of schemaKeys) {
		const property: JSONSchema7Definition = schema.properties
			? schema.properties[key]
			: defaultPropertyType;

		assertSchema(property, key);

		const info = schemaInfo(property ?? defaultPropertyType, !schema.required?.includes(key), [
			key
		]);
		if (!info) continue;

		if (!info.types.includes('boolean') && !schema.additionalProperties && !formData.has(key)) {
			continue;
		}

		const entries = formData.getAll(key);

		if (info.union && info.union.length > 1) {
			throw new SchemaError(unionError, key);
		}

		if (info.types.includes('array') || info.types.includes('set')) {
			// If no items, it could be a union containing the info
			const items = property.items ?? (info.union?.length == 1 ? info.union[0] : undefined);
			if (!items || typeof items == 'boolean' || (Array.isArray(items) && items.length != 1)) {
				throw new SchemaError(
					'Arrays must have a single "items" property that defines its type.',
					key
				);
			}

			const arrayType = Array.isArray(items) ? items[0] : items;
			assertSchema(arrayType, key);

			const arrayInfo = schemaInfo(arrayType, info.isOptional, [key]);
			if (!arrayInfo) continue;

			// Check for empty files being posted (and filtered)
			const isFileArray = entries.length && entries.some((e) => e && typeof e !== 'string');
			const arrayData = entries.map((e) => parseSingleEntry(key, e, arrayInfo));
			if (isFileArray && arrayData.every((file) => !file)) arrayData.length = 0;

			output[key] = info.types.includes('set') ? new Set(arrayData) : arrayData;
		} else {
			output[key] = parseSingleEntry(key, entries[entries.length - 1], info);
		}
	}

	return output;
}

function parseFormDataEntry(
	key: string,
	value: string,
	type: Exclude<SchemaType, 'null'>,
	info: SchemaInfo
): unknown {
	//console.log(`Parsing FormData ${key} (${type}): "${value}"`, info); //debug

	if (!value) {
		//console.log(`No FormData for "${key}" (${type}).`, info); //debug

		// Special case for booleans with default value true
		if (type == 'boolean' && info.isOptional && info.schema.default === true) {
			return false;
		}

		const defaultValue = defaultValues<unknown>(info.schema, info.isOptional, [key]);

		// Special case for empty posted enums, then the empty value should be returned,
		// otherwise even a required field will get a default value, resulting in that
		// posting missing enum values must use strict mode.
		if (info.schema.enum && defaultValue !== null && defaultValue !== undefined) {
			return value;
		}

		if (defaultValue !== undefined) return defaultValue;

		if (info.isNullable) return null;
		if (info.isOptional) return undefined;
	}

	function typeError() {
		throw new SchemaError(
			type[0].toUpperCase() +
				type.slice(1) +
				` type found. ` +
				`Set the dataType option to "json" and add use:enhance on the client to use nested data structures. ` +
				`More information: https://superforms.rocks/concepts/nested-data`,
			key
		);
	}

	switch (type) {
		case 'string':
		case 'any':
			return value;
		case 'integer':
			return parseInt(value ?? '', 10);
		case 'number':
			return parseFloat(value ?? '');
		case 'boolean':
			return Boolean(value == 'false' ? '' : value).valueOf();
		case 'unix-time': {
			// Must return undefined for invalid dates due to https://github.com/Rich-Harris/devalue/issues/51
			const date = new Date(value ?? '');
			return !isNaN(date as unknown as number) ? date : undefined;
		}
		case 'int64':
		case 'bigint':
			return BigInt(value ?? '.');
		case 'symbol':
			return Symbol(String(value));

		case 'set':
		case 'array':
		case 'object':
			return typeError();

		default:
			throw new SuperFormError('Unsupported schema type for FormData: ' + type);
	}
}
