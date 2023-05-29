import { fail, json, type RequestEvent } from '@sveltejs/kit';
import { parse, stringify } from 'devalue';
import {
  SuperFormError,
  type Validation,
  type ZodValidation,
  type UnwrapEffects
} from './index.js';
import {
  entityData,
  unwrapZodType,
  valueOrDefault,
  type Entity
} from './schemaEntity.js';

import { mapErrors, traversePath, type ZodTypeInfo } from './traversal.js';

import {
  z,
  type AnyZodObject,
  ZodObject,
  ZodAny,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDate,
  ZodLiteral,
  ZodUnion,
  ZodArray,
  ZodBigInt,
  ZodEnum,
  ZodNativeEnum,
  ZodSymbol,
  ZodEffects,
  type SafeParseReturnType
} from 'zod';

import { splitPath, type StringPathLeaves } from './stringPath.js';
export {
  splitPath,
  type StringPath,
  type StringPathLeaves
} from './stringPath.js';

import { clone } from './utils.js';

export { defaultValues } from './schemaEntity.js';

export function message<T extends ZodValidation<AnyZodObject>, M>(
  form: Validation<T, M>,
  message: M,
  options?: {
    status?: number;
    valid?: boolean;
  }
) {
  form.message = message;
  if (options?.valid !== undefined) form.valid = options.valid;

  const failure =
    (options?.status !== undefined && options.status >= 400) || !form.valid;

  return failure ? fail(options?.status ?? 400, { form }) : { form };
}

export const setMessage = message;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setError<T extends ZodValidation<AnyZodObject>>(
  form: Validation<T, unknown>,
  path: StringPathLeaves<z.infer<UnwrapEffects<T>>>,
  error: string | string[],
  options: { overwrite?: boolean; status?: number } = {
    overwrite: false,
    status: 400
  }
) {
  const errArr = Array.isArray(error) ? error : [error];

  if (!form.errors) form.errors = {};

  if (path === null || path === '') {
    console.warn(
      'Warning: Form-level errors added with "setError" will conflict with client-side validation. ' +
        'Use refine/superRefine on the schema instead, or the "message" helper.'
    );
    if (!form.errors._errors) form.errors._errors = [];
    form.errors._errors = form.errors._errors.concat(errArr);
  } else {
    const realPath = splitPath(path);

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

    if (!(typeInfo.zodType instanceof ZodArray)) {
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

    // If the value was empty, it now contains the default value,
    // so it can be returned immediately
    if (!value) return newValue;

    const zodType = typeInfo.zodType;

    if (zodType instanceof ZodString) {
      return value;
    } else if (zodType instanceof ZodNumber) {
      return zodType.isInt
        ? parseInt(value ?? '', 10)
        : parseFloat(value ?? '');
    } else if (zodType instanceof ZodBoolean) {
      return Boolean(value).valueOf();
    } else if (zodType instanceof ZodDate) {
      return new Date(value ?? '');
    } else if (zodType instanceof ZodArray) {
      const arrayType = unwrapZodType(zodType._def.type);
      return parseFormDataEntry(field, value, arrayType);
    } else if (zodType instanceof ZodBigInt) {
      try {
        return BigInt(value ?? '.');
      } catch {
        return NaN;
      }
    } else if (zodType instanceof ZodLiteral) {
      const literalType = typeof zodType.value;

      if (literalType === 'string') return value;
      else if (literalType === 'number') return parseFloat(value ?? '');
      else if (literalType === 'boolean') return Boolean(value).valueOf();
      else {
        throw new SuperFormError(
          'Unsupported ZodLiteral type: ' + literalType
        );
      }
    } else if (
      zodType instanceof ZodUnion ||
      zodType instanceof ZodEnum ||
      zodType instanceof ZodAny
    ) {
      return value;
    } else if (zodType instanceof ZodNativeEnum) {
      if (value in zodType.enum) {
        const enumValue = zodType.enum[value];
        if (typeof enumValue === 'number') return enumValue;
        else if (enumValue in zodType.enum) return zodType.enum[enumValue];
      }
      return undefined;
    } else if (zodType instanceof ZodSymbol) {
      return Symbol(value);
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
    ? { id, data }
    : {
        id,
        data: formDataToValidation(formData, schemaData)
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
  return parseFormData(convert, schemaData);
}

function validateResult<T extends AnyZodObject, M>(
  parsed: ParsedData,
  schemaData: SchemaData<T>,
  result: SafeParseReturnType<unknown, z.infer<T>> | undefined
): Validation<T, M> {
  const { opts: options, entityInfo } = schemaData;

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
        errors = mapErrors<T>(result.error.format());
      }
    }

    return {
      id,
      valid,
      errors,
      // Copy the default entity so it's not modified
      data: data ?? clone(entityInfo.defaultEntity),
      empty: true,
      constraints: entityInfo.constraints
    };
  } else {
    const { opts: options, schemaKeys, entityInfo } = schemaData;

    if (!result) {
      throw new SuperFormError(
        'Validation data exists without validation result.'
      );
    }

    if (!result.success) {
      const partialData = parsed.data as Partial<z.infer<T>>;
      const errors =
        options.errors !== false ? mapErrors<T>(result.error.format()) : {};

      return {
        id,
        valid: false,
        errors,
        data: Object.fromEntries(
          schemaKeys.map((key) => [
            key,
            key in partialData
              ? partialData[key]
              : clone(entityInfo.defaultEntity[key])
          ])
        ),
        empty: false,
        constraints: entityInfo.constraints
      };
    } else {
      return {
        id,
        valid: true,
        errors: {},
        data: result.data,
        empty: false,
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

  while (unwrappedSchema instanceof ZodEffects) {
    hasEffects = true;
    unwrappedSchema = (unwrappedSchema as ZodEffects<T>)._def.schema;
  }

  if (!(unwrappedSchema instanceof ZodObject)) {
    throw new SuperFormError(
      'Only Zod schema objects can be used with superValidate. ' +
        'Define the schema with z.object({ ... }) and optionally refine/superRefine/transform at the end.'
    );
  }

  const entityInfo = entityData(unwrappedSchema, options?.warnings);

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
): Promise<Validation<UnwrapEffects<T>, M>>;

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
): Promise<Validation<UnwrapEffects<T>, M>>;

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
): Promise<Validation<UnwrapEffects<T>, M>> {
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
      return { id: undefined, data: undefined };
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
      parsed = { id: undefined, data: data as Record<string, unknown> };
    }

    //////////////////////////////////////////////////////////////////////
    // This logic is shared between superValidate and superValidateSync //
    const toValidate = dataToValidate(parsed, schemaData);
    const result = toValidate
      ? schemaData.originalSchema.safeParse(toValidate)
      : undefined;
    //////////////////////////////////////////////////////////////////////

    return { parsed, result };
  }

  const { parsed, result } = await parseRequest();
  return validateResult<UnwrapEffects<T>, M>(parsed, schemaData, result);
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
      }
) {
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
                'Set-Cookie': `flash=${encodeURIComponent(
                  JSON.stringify(options.message)
                )}; Path=/; Max-Age=120`
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

////////////////////////////////////////////////////////////////////

export function superValidateSync<
  T extends ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  schema: T,
  options?: SuperValidateOptions
): Validation<UnwrapEffects<T>, M>;

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
): Validation<UnwrapEffects<T>, M>;

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
): Validation<UnwrapEffects<T>, M> {
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
      : { id: undefined, data: data as Record<string, unknown> }; // Only schema, null or undefined left

  //////////////////////////////////////////////////////////////////////
  // This logic is shared between superValidate and superValidateSync //
  const toValidate = dataToValidate(parsed, schemaData);
  const result = toValidate
    ? schemaData.originalSchema.safeParse(toValidate)
    : undefined;
  //////////////////////////////////////////////////////////////////////

  return validateResult<UnwrapEffects<T>, M>(parsed, schemaData, result);
}
