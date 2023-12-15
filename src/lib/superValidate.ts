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
  ZodBranded,
  ZodTypeAny,
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
  schemaData: SchemaData<T>,
  preprocessed?: (keyof z.infer<T>)[]
): { partial: Partial<z.infer<T>>; parsed: z.infer<T> } {
  const strictData: Record<string, unknown> = {};
  const parsedData: Record<string, unknown> = {};
  const { schemaKeys, entityInfo } = schemaData;

  for (const key of schemaKeys) {
    const typeInfo = entityInfo.typeInfo[key];
    const entries = data.getAll(key);

    if (!(typeInfo.zodType._def.typeName == 'ZodArray')) {
      parsedData[key] = parseSingleEntry(key, entries[0], typeInfo);
    } else {
      const arrayType = unwrapZodType(typeInfo.zodType._def.type);
      parsedData[key] = entries.map((e) =>
        parseSingleEntry(key, e, arrayType)
      );
    }

    if (!entries.length && !typeInfo.isOptional) {
      strictData[key] = undefined;
    } else {
      strictData[key] = parsedData[key];
    }
  }

  for (const key of Object.keys(strictData)) {
    if (strictData[key] === undefined) delete strictData[key];
  }

  return { parsed: parsedData, partial: strictData };

  function parseSingleEntry(
    key: string,
    entry: FormDataEntryValue,
    typeInfo: ZodTypeInfo
  ) {
    if (preprocessed && preprocessed.includes(key)) {
      return entry;
    }

    if (entry && typeof entry !== 'string') {
      // File object, not supported
      return undefined;
    }

    return parseFormDataEntry(key, entry, typeInfo);
  }

  function parseFormDataEntry(
    field: string,
    value: string | null,
    typeInfo: ZodTypeInfo
  ): unknown {
    const newValue = valueOrDefault(value, typeInfo);
    const zodType = typeInfo.zodType;
    const typeName = zodType._def.typeName;

    // If the value was empty, it now contains the default value,
    // so it can be returned immediately, unless it's boolean, which
    // means it could have been posted as a checkbox.
    if (!value && typeName != 'ZodBoolean') {
      return newValue;
    }

    //console.log(`FormData field "${field}" (${typeName}): ${value}`

    if (typeName == 'ZodString') {
      return value;
    } else if (typeName == 'ZodNumber') {
      return (zodType as ZodNumber).isInt
        ? parseInt(value ?? '', 10)
        : parseFloat(value ?? '');
    } else if (typeName == 'ZodBoolean') {
      return Boolean(value == 'false' ? '' : value).valueOf();
    } else if (typeName == 'ZodDate') {
      return new Date(value ?? '');
    } else if (typeName == 'ZodArray') {
      const arrayType = unwrapZodType(zodType._def.type);
      return parseFormDataEntry(field, value, arrayType);
    } else if (typeName == 'ZodBigInt') {
      try {
        return BigInt(value ?? '.');
      } catch {
        return NaN;
      }
    } else if (typeName == 'ZodLiteral') {
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
      typeName == 'ZodUnion' ||
      typeName == 'ZodEnum' ||
      typeName == 'ZodAny'
    ) {
      return value;
    } else if (typeName == 'ZodNativeEnum') {
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
    } else if (typeName == 'ZodSymbol') {
      return Symbol(String(value));
    }

    if (typeName == 'ZodObject') {
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
}

///// superValidate helpers /////////////////////////////////////////

type SchemaData<T extends AnyZodObject> = {
  originalSchema: ZodValidation<T>;
  unwrappedSchema: T;
  hasEffects: boolean;
  entityInfo: Entity<T>;
  schemaKeys: string[];
  opts: SuperValidateOptions<T>;
};

type ParsedData<T extends Record<string, unknown>> = {
  id: string | undefined;
  posted: boolean;
  data: T | null | undefined;
  // Used in strict mode
  partialData: Partial<T> | null | undefined;
};

/**
 * Check what data to validate. If no parsed data, the default entity
 * may still have to be validated if there are side-effects or errors
 * should be displayed.
 */
function dataToValidate<T extends AnyZodObject>(
  parsed: ParsedData<z.infer<T>>,
  schemaData: SchemaData<T>,
  strict: boolean
): Record<string, unknown> | undefined {
  if (!parsed.data) {
    return schemaData.hasEffects || schemaData.opts.errors === true
      ? schemaData.entityInfo.defaultEntity
      : undefined;
  } else if (strict && parsed.partialData) {
    return parsed.partialData;
  } else return parsed.data;
}

function parseFormData<T extends AnyZodObject>(
  formData: FormData,
  schemaData: SchemaData<T>,
  options?: SuperValidateOptions<T>
): ParsedData<z.infer<T>> {
  function tryParseSuperJson() {
    if (formData.has('__superform_json')) {
      try {
        const output = parse(
          formData.getAll('__superform_json').join('') ?? ''
        );
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

  if (data) {
    return { id, data, posted: true, partialData: null };
  }

  const parsed = formDataToValidation(
    formData,
    schemaData,
    options?.preprocessed
  );

  return {
    id,
    data: parsed.parsed,
    partialData: parsed.partial,
    posted: true
  };
}

function parseSearchParams<T extends AnyZodObject>(
  data: URL | URLSearchParams,
  schemaData: SchemaData<T>,
  options?: SuperValidateOptions<T>
): ParsedData<z.infer<T>> {
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

function validateResult<T extends AnyZodObject, M>(
  parsed: ParsedData<z.infer<T>>,
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

      let data;

      if (options.strict) {
        data = parsed.data;
      } else if (zodKeyStatus == 'passthrough') {
        data = { ...clone(entityInfo.defaultEntity), ...partialData };
      } else {
        data = Object.fromEntries(
          schemaKeys.map((key) => [
            key,
            key in partialData
              ? partialData[key]
              : clone(entityInfo.defaultEntity[key])
          ])
        );
      }

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
  options: SuperValidateOptions<T> | undefined
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

export type SuperValidateOptions<T extends AnyZodObject = AnyZodObject> =
  Partial<{
    strict: boolean;
    errors: boolean;
    id: string;
    warnings: {
      multipleRegexps?: boolean;
      multipleSteps?: boolean;
    };
    preprocessed: (keyof z.infer<T>)[];
  }>;

export async function superValidate<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
  schema: T,
  options?: SuperValidateOptions<UnwrapEffects<T>>
): Promise<SuperValidated<UnwrapEffects<T>, M>>;

export async function superValidate<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = App.Superforms.Message extends never ? any : App.Superforms.Message
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
  options?: SuperValidateOptions<UnwrapEffects<T>>
): Promise<SuperValidated<UnwrapEffects<T>, M>>;

/**
 * Validates a Zod schema for usage in a SvelteKit form.
 * @param data Data structure for a Zod schema, or RequestEvent/FormData/URL. If falsy, the schema's defaultEntity will be used.
 * @param schema The Zod schema to validate against.
 */
export async function superValidate<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
  data: unknown,
  schema?: T | SuperValidateOptions<UnwrapEffects<T>>,
  options?: SuperValidateOptions<UnwrapEffects<T>>
): Promise<SuperValidated<UnwrapEffects<T>, M>> {
  if (data && typeof data === 'object' && 'safeParseAsync' in data) {
    options = schema as SuperValidateOptions<UnwrapEffects<T>> | undefined;
    schema = data as T;
    data = null;
  }

  const schemaData = getSchemaData(schema as UnwrapEffects<T>, options);

  async function tryParseFormData(
    request: Request
  ): Promise<ParsedData<z.infer<UnwrapEffects<T>>>> {
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
      return {
        id: undefined,
        data: undefined,
        posted: false,
        partialData: undefined
      };
    }
    return parseFormData(formData, schemaData, options);
  }

  async function parseRequest() {
    let parsed: ParsedData<z.infer<UnwrapEffects<T>>>;

    if (data instanceof FormData) {
      parsed = parseFormData(data, schemaData, options);
    } else if (data instanceof URL || data instanceof URLSearchParams) {
      parsed = parseSearchParams(data, schemaData, options);
    } else if (data instanceof Request) {
      parsed = await tryParseFormData(data);
    } else if (
      data &&
      typeof data === 'object' &&
      'request' in data &&
      data.request instanceof Request
    ) {
      parsed = await tryParseFormData(data.request);
    } else if (options?.strict) {
      // Ensure that defaults are set on data if strict mode is enabled (Should this maybe always happen?)
      const params = new URLSearchParams(data as Record<string, string>);
      parsed = parseSearchParams(params, schemaData, options);
    } else {
      parsed = {
        id: undefined,
        posted: false,
        data: data as Record<string, unknown>,
        partialData: data as Record<string, unknown>
      };
    }

    //////////////////////////////////////////////////////////////////////
    // This logic is shared between superValidate and superValidateSync //
    const toValidate = dataToValidate(
      parsed,
      schemaData,
      options?.strict || false
    );
    const result = toValidate
      ? await schemaData.originalSchema.safeParseAsync(toValidate)
      : undefined;
    //////////////////////////////////////////////////////////////////////

    return { parsed, result };
  }

  const { parsed, result } = await parseRequest();

  const superValidated = validateResult<UnwrapEffects<T>, M>(
    parsed,
    schemaData,
    result
  );
  return superValidated;
}

////////////////////////////////////////////////////////////////////

export function superValidateSync<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
  schema: T,
  options?: SuperValidateOptions<UnwrapEffects<T>>
): SuperValidated<UnwrapEffects<T>, M>;

export function superValidateSync<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
  data:
    | FormData
    | URLSearchParams
    | URL
    | Partial<z.infer<UnwrapEffects<T>>>
    | null
    | undefined,
  schema: T,
  options?: SuperValidateOptions<UnwrapEffects<T>>
): SuperValidated<UnwrapEffects<T>, M>;

/**
 * Validates a Zod schema for usage in a SvelteKit form.
 * @param data Data structure for a Zod schema, or RequestEvent/FormData/URL. If falsy, the schema's defaultEntity will be used.
 * @param schema The Zod schema to validate against.
 */
export function superValidateSync<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
  data: unknown,
  schema?: T | SuperValidateOptions<UnwrapEffects<T>>,
  options?: SuperValidateOptions<UnwrapEffects<T>>
): SuperValidated<UnwrapEffects<T>, M> {
  if (data && typeof data === 'object' && 'safeParse' in data) {
    options = schema as SuperValidateOptions<UnwrapEffects<T>> | undefined;
    schema = data as T;
    data = null;
  }

  const schemaData = getSchemaData(schema as UnwrapEffects<T>, options);

  const parsed =
    data instanceof FormData
      ? parseFormData(data, schemaData, options)
      : data instanceof URL || data instanceof URLSearchParams
      ? parseSearchParams(data, schemaData)
      : {
          id: undefined,
          data: data as z.infer<UnwrapEffects<T>>,
          partialData: data as z.infer<UnwrapEffects<T>>,
          posted: false
        }; // Only schema, null or undefined left

  //////////////////////////////////////////////////////////////////////
  // This logic is shared between superValidate and superValidateSync //
  const toValidate = dataToValidate(
    parsed,
    schemaData,
    options?.strict || false
  );
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
