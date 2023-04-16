import { fail, json, type RequestEvent } from '@sveltejs/kit';
import { parse, stringify } from 'devalue';
import {
  SuperFormError,
  type FieldPath,
  type Validation,
  type ZodValidation,
  type UnwrapEffects
} from './index.js';
import {
  entityData,
  unwrapZodType,
  valueOrDefault
} from './schemaEntity.js';

import { traversePath, type ZodTypeInfo } from './entity.js';

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
  ZodEffects
} from 'zod';

import { mapErrors } from './entity.js';
import { clone } from './utils.js';

export { defaultData } from './schemaEntity.js';

export function message<T extends UnwrapEffects<AnyZodObject>, M>(
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setError<T extends UnwrapEffects<AnyZodObject>>(
  form: Validation<T, unknown>,
  path: keyof z.infer<T> | FieldPath<z.infer<T>> | [] | null,
  error: string | string[],
  options: { overwrite?: boolean; status?: number } = {
    overwrite: false,
    status: 400
  }
) {
  const errArr = Array.isArray(error) ? error : [error];

  if (!form.errors) form.errors = {};

  if (path === null || (Array.isArray(path) && path.length === 0)) {
    if (!form.errors._errors) form.errors._errors = [];
    form.errors._errors = form.errors._errors.concat(errArr);
  } else {
    const realPath = (Array.isArray(path) ? path : [path]) as FieldPath<
      z.infer<T>
    >;

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
  schema: T,
  fields: string[],
  data: FormData
) {
  const output: Record<string, unknown> = {};
  const entityInfo = entityData(schema);

  function parseSingleEntry(
    key: string,
    entry: FormDataEntryValue,
    typeInfo: ZodTypeInfo
  ) {
    if (entry && typeof entry !== 'string') {
      // File object, not supported
      /*
      throw new SuperFormError(
        `Field "${key}" contains a file, which is not supported by Superforms. Remove it from the schema and use FormData directly instead.`
      );
      return (entry.valueOf() as File).name;
      return entry as File;
      */
      return undefined;
    } else {
      return parseEntry(key, entry, typeInfo);
    }
  }

  for (const key of fields) {
    const typeInfo = entityInfo.typeInfo[key];
    const entries = data.getAll(key);

    if (!(typeInfo.zodType instanceof ZodArray)) {
      output[key] = parseSingleEntry(key, entries[0], typeInfo);
    } else {
      const arrayType = unwrapZodType(typeInfo.zodType._def.type);
      output[key] = entries.map((e) => parseSingleEntry(key, e, arrayType));
    }
  }

  function parseEntry(
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
      return parseEntry(field, value, arrayType);
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
      //console.log(field, typeof value, value, zodType.enum);
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

export type SuperValidateOptions = {
  /**
   * @deprecated Use errors instead.
   */
  noErrors?: boolean;
  errors?: boolean;
  includeMeta?: boolean;
  id?: true | string;
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
  if (
    data &&
    (data.constructor.name === 'ZodObject' ||
      data.constructor.name === 'ZodEffects')
  ) {
    options = schema as SuperValidateOptions | undefined;
    schema = data as T;
    data = null;
  }

  options = {
    noErrors: false,
    errors: undefined,
    includeMeta: false,
    ...options
  };

  const originalSchema = schema as T;

  let wrappedSchema = schema;
  let hasEffects = false;

  while (wrappedSchema instanceof ZodEffects) {
    hasEffects = true;
    wrappedSchema = (wrappedSchema as ZodEffects<T>)._def.schema;
  }

  if (!(wrappedSchema instanceof ZodObject)) {
    throw new SuperFormError(
      'Only Zod schema objects can be used with superValidate. Define the schema with z.object({ ... }) and optionally refine/superRefine/transform at the end.'
    );
  }

  const realSchema = wrappedSchema as UnwrapEffects<T>;

  const entityInfo = entityData(realSchema);
  const schemaKeys = entityInfo.keys;

  function parseFormData(data: FormData) {
    function tryParseSuperJson(data: FormData) {
      if (data.has('__superform_json')) {
        try {
          const output = parse(
            data.get('__superform_json')?.toString() ?? ''
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

    const superJson = tryParseSuperJson(data);
    return superJson
      ? superJson
      : formDataToValidation(realSchema, schemaKeys, data);
  }

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
      return null;
    }
    return parseFormData(formData);
  }

  function parseSearchParams(data: URL | URLSearchParams) {
    if (data instanceof URL) data = data.searchParams;

    const convert = new FormData();
    for (const [key, value] of data.entries()) {
      convert.append(key, value);
    }
    return parseFormData(convert);
  }

  // If FormData exists, don't check for missing fields.
  // Checking only at GET requests, basically, where
  // the data is coming from the DB.

  if (data instanceof FormData) {
    data = parseFormData(data);
  } else if (data instanceof Request) {
    data = await tryParseFormData(data);
  } else if (data instanceof URL || data instanceof URLSearchParams) {
    data = parseSearchParams(data);
  } else if (
    data &&
    typeof data === 'object' &&
    'request' in data &&
    data.request instanceof Request
  ) {
    data = await tryParseFormData(data.request);
  }

  let output: Validation<UnwrapEffects<T>, M>;

  if (!data) {
    const addErrors = options.errors === true;

    let valid = false;
    let errors = {};

    if (hasEffects || addErrors) {
      const result = await originalSchema.spa(entityInfo.defaultEntity);

      valid = result.success;

      if (result.success) {
        data = result.data;
      } else if (addErrors) {
        errors = mapErrors<UnwrapEffects<T>>(result.error.format());
      }
    }

    output = {
      valid,
      errors,
      // Copy the default entity so it's not modified
      data: data ?? clone(entityInfo.defaultEntity),
      empty: true,
      constraints: entityInfo.constraints
    };
  } else {
    const addErrors = options.errors !== false && options.noErrors !== true;

    const partialData = data as Partial<z.infer<T>>;
    const result = await originalSchema.spa(partialData);

    if (!result.success) {
      const errors = addErrors
        ? mapErrors<UnwrapEffects<T>>(result.error.format())
        : {};

      //console.log(result.error.format(), errors);

      output = {
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
      output = {
        valid: true,
        errors: {},
        data: result.data,
        empty: false,
        constraints: entityInfo.constraints
      };
    }
  }

  if (options.includeMeta) {
    output.meta = entityInfo.meta;
  }

  if (options.id !== undefined) {
    output.id = options.id === true ? entityInfo.hash : options.id;
  }

  return output;
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
