import {
  fail,
  json,
  type RequestEvent,
  type ActionFailure
} from '@sveltejs/kit';
import { parse, stringify } from 'devalue';
import {
  SuperFormError,
  type SuperValidated,
  type ZodValidation,
  type UnwrapEffects
} from './index.js';
import {
  entityData,
  unwrapZodType,
  valueOrDefault,
  type Entity,
  type ZodTypeInfo
} from './schemaEntity.js';

import { traversePath } from './traversal.js';

import type {
  z,
  AnyZodObject,
  ZodNumber,
  ZodLiteral,
  ZodNativeEnum,
  ZodEffects,
  SafeParseReturnType,
  EnumLike
} from 'zod';

import { splitPath, type StringPathLeaves } from './stringPath.js';

import { clone, type NumericRange } from './utils.js';
import { mapErrors } from './errors.js';

export { defaultValues } from './schemaEntity.js';

/**
 * Sends a message with a form, with an optional HTTP status code that will set
 * form.valid to false if status >= 400. A status lower than 400 cannot be sent.
 */
export function message<T extends ZodValidation<AnyZodObject>, M>(
  form: SuperValidated<T, M>,
  message: M,
  options?: {
    status?: NumericRange<400, 599>;
  }
) {
  if (options?.status && options.status >= 400) {
    form.valid = false;
  }

  form.message = message;
  return !form.valid ? fail(options?.status ?? 400, { form }) : { form };
}

export const setMessage = message;

type SetErrorOptions = {
  overwrite?: boolean;
  status?: NumericRange<400, 599>;
};

/**
 * Sets a form-level error.
 * form.valid is automatically set to false.
 *
 * @param {SuperValidated<T, unknown>} form A validation object, usually returned from superValidate.
 * @param {string | string[]} error Error message(s).
 * @param {SetErrorOptions} options Option to overwrite previous errors and set a different status than 400. The status must be in the range 400-599.
 * @returns fail(status, { form })
 */
export function setError<T extends ZodValidation<AnyZodObject>>(
  form: SuperValidated<T, unknown>,
  error: string | string[],
  options?: SetErrorOptions
): ActionFailure<{ form: SuperValidated<T, unknown> }>;

/**
 * Sets an error for a form field or array field.
 * form.valid is automatically set to false.
 *
 * @param {SuperValidated<T, unknown>} form A validation object, usually returned from superValidate.
 * @param {'' | StringPathLeaves<z.infer<UnwrapEffects<T>>, '_errors'>} path Path to the form field. Use an empty string to set a form-level error. Array-level errors can be set by appending "._errors" to the field.
 * @param {string | string[]} error Error message(s).
 * @param {SetErrorOptions} options Option to overwrite previous errors and set a different status than 400. The status must be in the range 400-599.
 * @returns fail(status, { form })
 */
export function setError<T extends ZodValidation<AnyZodObject>>(
  form: SuperValidated<T, unknown>,
  path: '' | StringPathLeaves<z.infer<UnwrapEffects<T>>, '_errors'>,
  error: string | string[],
  options?: SetErrorOptions
): ActionFailure<{ form: SuperValidated<T, unknown> }>;

export function setError<T extends ZodValidation<AnyZodObject>>(
  form: SuperValidated<T, unknown>,
  path:
    | string
    | string[]
    | (string & StringPathLeaves<z.infer<UnwrapEffects<T>>, '_errors'>),
  error?: string | string[] | SetErrorOptions,
  options?: SetErrorOptions
): ActionFailure<{ form: SuperValidated<T, unknown> }> {
  // Unify signatures
  if (
    error == undefined ||
    (typeof error !== 'string' && !Array.isArray(error))
  ) {
    options = error;
    error = path;
    path = '';
  }

  if (options === undefined) options = {};

  const errArr = Array.isArray(error) ? error : [error];

  if (!form.errors) form.errors = {};

  if (path === null || path === '') {
    if (!form.errors._errors) form.errors._errors = [];
    form.errors._errors = options.overwrite
      ? errArr
      : form.errors._errors.concat(errArr);
  } else {
    const realPath = splitPath(path as string);

    const leaf = traversePath(
      form.errors,
      realPath,
      ({ parent, key, value }) => {
        if (value === undefined) parent[key] = {};
        return parent[key];
      }
    );

    if (leaf) {
      leaf.parent[leaf.key] =
        Array.isArray(leaf.value) && !options.overwrite
          ? leaf.value.concat(errArr)
          : errArr;
    }
  }

  form.valid = false;
  return fail(options.status ?? 400, { form });
}

function formDataToValidation<T extends AnyZodObject>(
  data: FormData,
  schemaData: SchemaData<T>
) {
  const output: Record<string, unknown> = {};
  const { schemaKeys, entityInfo } = schemaData;

  function parseSingleEntry(
    key: string,
    entry: FormDataEntryValue,
    typeInfo: ZodTypeInfo
  ) {
    if (entry && typeof entry !== 'string') {
      // File object, not supported
      return undefined;
    } else {
      return parseFormDataEntry(key, entry, typeInfo);
    }
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

  function parseFormDataEntry(
    field: string,
    value: string | null,
    typeInfo: ZodTypeInfo
  ): unknown {
    const newValue = valueOrDefault(value, false, true, typeInfo);
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
      return (zodType as ZodNumber).isInt
        ? parseInt(value ?? '', 10)
        : parseFloat(value ?? '');
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
        throw new SuperFormError(
          'Unsupported ZodLiteral type: ' + literalType
        );
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
      } else if (
        value !== null &&
        Object.values(zodEnum.enum).includes(value)
      ) {
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

    throw new SuperFormError(
      'Unsupported Zod default type: ' + zodType.constructor.name
    );
  }

  return output as z.infer<T>;
}

///// superValidate helpers /////////////////////////////////////////

type SchemaData<T extends AnyZodObject> = {
  originalSchema: ZodValidation<T>;
  unwrappedSchema: T;
  hasEffects: boolean;
  entityInfo: Entity<T>;
  schemaKeys: string[];
  opts: SuperValidateOptions;
};

type ParsedData = {
  id: string | undefined;
  posted: boolean;
  data: Record<string, unknown> | null | undefined;
};

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

function parseFormData<T extends AnyZodObject>(
  formData: FormData,
  schemaData: SchemaData<T>
): ParsedData {
  function tryParseSuperJson() {
    if (formData.has('__superform_json')) {
      try {
        const output = parse(
          formData.getAll('__superform_json').join('') ?? ''
        );
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
        data: formDataToValidation(formData, schemaData),
        posted: true
      };
}

function parseSearchParams<T extends AnyZodObject>(
  data: URL | URLSearchParams,
  schemaData: SchemaData<T>
): ParsedData {
  if (data instanceof URL) data = data.searchParams;

  const convert = new FormData();
  for (const [key, value] of data.entries()) {
    convert.append(key, value);
  }

  // Only FormData can be posted.
  const output = parseFormData(convert, schemaData);
  output.posted = false;
  return output;
}

function validateResult<T extends AnyZodObject, M>(
  parsed: ParsedData,
  schemaData: SchemaData<T>,
  result: SafeParseReturnType<unknown, z.infer<T>> | undefined
): SuperValidated<T, M> {
  const { opts: options, entityInfo } = schemaData;
  const posted = parsed.posted;

  // Determine id for form
  // 1. options.id
  // 2. formData.__superform_id
  // 3. schema hash
  const id = parsed.data
    ? options.id ?? parsed.id ?? entityInfo.hash
    : options.id ?? entityInfo.hash;

  if (!parsed.data) {
    let data: z.infer<T> | undefined = undefined;
    let errors: ReturnType<typeof mapErrors> = {};

    const valid = result?.success ?? false;
    const { opts: options, entityInfo } = schemaData;

    if (result) {
      if (result.success) {
        data = result.data;
      } else if (options.errors === true) {
        errors = mapErrors<T>(result.error.format(), entityInfo.errorShape);
      }
    }

    return {
      id,
      valid,
      posted,
      errors,
      // Copy the default entity so it's not modified
      data: data ?? clone(entityInfo.defaultEntity),
      constraints: entityInfo.constraints
    };
  } else {
    const {
      opts: options,
      schemaKeys,
      entityInfo,
      unwrappedSchema
    } = schemaData;

    if (!result) {
      throw new SuperFormError(
        'Validation data exists without validation result.'
      );
    }

    if (!result.success) {
      const partialData = parsed.data as Partial<z.infer<T>>;
      const errors =
        options.errors !== false
          ? mapErrors<T>(result.error.format(), entityInfo.errorShape)
          : {};

      // passthrough, strip, strict
      const zodKeyStatus = unwrappedSchema._def.unknownKeys;

      const data =
        zodKeyStatus == 'passthrough'
          ? { ...clone(entityInfo.defaultEntity), ...partialData }
          : Object.fromEntries(
              schemaKeys.map((key) => [
                key,
                key in partialData
                  ? partialData[key]
                  : clone(entityInfo.defaultEntity[key])
              ])
            );

      return {
        id,
        valid: false,
        posted,
        errors,
        data,
        constraints: entityInfo.constraints
      };
    } else {
      return {
        id,
        valid: true,
        posted,
        errors: {},
        data: result.data,
        constraints: entityInfo.constraints
      };
    }
  }
}

function getSchemaData<T extends AnyZodObject>(
  schema: ZodValidation<T>,
  options: SuperValidateOptions | undefined
): SchemaData<T> {
  const originalSchema = schema as T;

  let unwrappedSchema = schema;
  let hasEffects = false;

  while (unwrappedSchema._def.typeName == 'ZodEffects') {
    hasEffects = true;
    unwrappedSchema = (unwrappedSchema as ZodEffects<T>)._def.schema;
  }

  if (!(unwrappedSchema._def.typeName == 'ZodObject')) {
    throw new SuperFormError(
      'Only Zod schema objects can be used with superValidate. ' +
        'Define the schema with z.object({ ... }) and optionally refine/superRefine/transform at the end.'
    );
  }

  const entityInfo = entityData(
    unwrappedSchema as UnwrapEffects<T>,
    options?.warnings
  );

  return {
    originalSchema,
    unwrappedSchema: unwrappedSchema as UnwrapEffects<T>,
    hasEffects,
    entityInfo,
    schemaKeys: entityInfo.keys,
    opts: options ?? {}
  };
}

/////////////////////////////////////////////////////////////////////

export type SuperValidateOptions = {
  errors?: boolean;
  id?: string;
  warnings?: {
    multipleRegexps?: boolean;
    multipleSteps?: boolean;
  };
};

export async function superValidate<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  schema: T,
  options?: SuperValidateOptions
): Promise<SuperValidated<UnwrapEffects<T>, M>>;

export async function superValidate<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  data:
    | RequestEvent
    | Request
    | FormData
    | URLSearchParams
    | URL
    | Partial<z.infer<UnwrapEffects<T>>>
    | null
    | undefined,
  schema: T,
  options?: SuperValidateOptions
): Promise<SuperValidated<UnwrapEffects<T>, M>>;

/**
 * Validates a Zod schema for usage in a SvelteKit form.
 * @param data Data structure for a Zod schema, or RequestEvent/FormData/URL. If falsy, the schema's defaultEntity will be used.
 * @param schema The Zod schema to validate against.
 */
export async function superValidate<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  data: unknown,
  schema?: T | SuperValidateOptions,
  options?: SuperValidateOptions
): Promise<SuperValidated<UnwrapEffects<T>, M>> {
  if (data && typeof data === 'object' && 'safeParseAsync' in data) {
    options = schema as SuperValidateOptions | undefined;
    schema = data as T;
    data = null;
  }

  const schemaData = getSchemaData(schema as UnwrapEffects<T>, options);

  async function tryParseFormData(request: Request) {
    let formData: FormData | undefined = undefined;
    try {
      formData = await request.formData();
    } catch (e) {
      if (
        e instanceof TypeError &&
        e.message.includes('already been consumed')
      ) {
        // Pass through the "body already consumed" error, which applies to
        // POST requests when event/request is used after formData has been fetched.
        throw e;
      }
      // No data found, return an empty form
      return { id: undefined, data: undefined, posted: false };
    }
    return parseFormData(formData, schemaData);
  }

  async function parseRequest() {
    let parsed: ParsedData;

    if (data instanceof FormData) {
      parsed = parseFormData(data, schemaData);
    } else if (data instanceof URL || data instanceof URLSearchParams) {
      parsed = parseSearchParams(data, schemaData);
    } else if (data instanceof Request) {
      parsed = await tryParseFormData(data);
    } else if (
      data &&
      typeof data === 'object' &&
      'request' in data &&
      data.request instanceof Request
    ) {
      parsed = await tryParseFormData(data.request);
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

  const { parsed, result } = await parseRequest();
  return validateResult<UnwrapEffects<T>, M>(parsed, schemaData, result);
}

////////////////////////////////////////////////////////////////////

export function superValidateSync<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  schema: T,
  options?: SuperValidateOptions
): SuperValidated<UnwrapEffects<T>, M>;

export function superValidateSync<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  data:
    | FormData
    | URLSearchParams
    | URL
    | Partial<z.infer<UnwrapEffects<T>>>
    | null
    | undefined,
  schema: T,
  options?: SuperValidateOptions
): SuperValidated<UnwrapEffects<T>, M>;

/**
 * Validates a Zod schema for usage in a SvelteKit form.
 * @param data Data structure for a Zod schema, or RequestEvent/FormData/URL. If falsy, the schema's defaultEntity will be used.
 * @param schema The Zod schema to validate against.
 */
export function superValidateSync<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  data: unknown,
  schema?: T | SuperValidateOptions,
  options?: SuperValidateOptions
): SuperValidated<UnwrapEffects<T>, M> {
  if (data && typeof data === 'object' && 'safeParse' in data) {
    options = schema as SuperValidateOptions | undefined;
    schema = data as T;
    data = null;
  }

  const schemaData = getSchemaData(schema as UnwrapEffects<T>, options);

  const parsed =
    data instanceof FormData
      ? parseFormData(data, schemaData)
      : data instanceof URL || data instanceof URLSearchParams
      ? parseSearchParams(data, schemaData)
      : {
          id: undefined,
          data: data as Record<string, unknown>,
          posted: false
        }; // Only schema, null or undefined left

  //////////////////////////////////////////////////////////////////////
  // This logic is shared between superValidate and superValidateSync //
  const toValidate = dataToValidate(parsed, schemaData);
  const result = toValidate
    ? schemaData.originalSchema.safeParse(toValidate)
    : undefined;
  //////////////////////////////////////////////////////////////////////

  return validateResult<UnwrapEffects<T>, M>(parsed, schemaData, result);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Cookie configuration options. The defaults are:
 * Path=/; Max-Age=120; SameSite=Strict;
 */
export interface CookieSerializeOptions {
  path?: string | undefined;
  maxAge?: number | undefined;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean | undefined;
}

export function actionResult<
  T extends Record<string, unknown> | App.Error | string,
  Type extends T extends string
    ? 'redirect' | 'error'
    : 'success' | 'failure' | 'error'
>(
  type: Type,
  data?: T,
  options?:
    | number
    | {
        status?: number;
        message?: Type extends 'redirect' ? App.PageData['flash'] : never;
        cookieOptions?: CookieSerializeOptions;
      }
) {
  function cookieData() {
    if (typeof options === 'number' || !options?.message) return '';

    const extra = [
      `Path=${options?.cookieOptions?.path || '/'}`,
      `Max-Age=${options?.cookieOptions?.maxAge || 120}`,
      `SameSite=${options?.cookieOptions?.sameSite ?? 'Strict'}`
    ];

    if (options?.cookieOptions?.secure) {
      extra.push(`Secure`);
    }

    return (
      `flash=${encodeURIComponent(JSON.stringify(options.message))}; ` +
      extra.join('; ')
    );
  }

  const status =
    options && typeof options !== 'number' ? options.status : options;

  const result = <T extends { status: number }>(struct: T) => {
    return json(
      { type, ...struct },
      {
        status: struct.status,
        headers:
          typeof options === 'object' && options.message
            ? {
                'Set-Cookie': cookieData()
              }
            : undefined
      }
    );
  };

  if (type == 'error') {
    return result({
      status: status || 500,
      error: typeof data === 'string' ? { message: data } : data
    });
  } else if (type == 'redirect') {
    return result({
      status: status || 303,
      location: data
    });
  } else if (type == 'failure') {
    return result({
      status: status || 400,
      data: stringify(data)
    });
  } else {
    return result({ status: status || 200, data: stringify(data) });
  }
}
