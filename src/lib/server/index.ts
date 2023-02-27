import { fail, json, type RequestEvent } from '@sveltejs/kit';
import { parse, stringify } from 'devalue';
import type { Validation, ValidationErrors } from '..';
import {
  entityData,
  zodTypeInfo,
  type DefaultEntityOptions,
  type ZodTypeInfo
} from './entity';

import {
  z,
  type AnyZodObject,
  ZodAny,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDate,
  ZodLiteral,
  ZodUnion,
  ZodArray,
  ZodBigInt,
  ZodObject,
  ZodSymbol,
  ZodEnum
} from 'zod';

export { defaultEntity } from './entity';

export function setError<T extends AnyZodObject>(
  form: Validation<T>,
  field: keyof z.infer<T>,
  error: string | string[] | null
) {
  const errArr = Array.isArray(error) ? error : error ? [error] : [];

  if (form.errors[field]) {
    form.errors[field] = form.errors[field]?.concat(errArr);
  } else {
    form.errors[field] = errArr;
  }
  form.valid = false;
  return fail(400, { form });
}

export function noErrors<T extends AnyZodObject>(
  form: Validation<T>
): Validation<T> {
  return { ...form, errors: {} };
}

function formDataToValidation<T extends AnyZodObject>(
  schema: T,
  fields: string[],
  data: FormData
) {
  const output: Record<string, unknown> = {};
  const entityInfo = entityData(schema);

  function parseSingleEntry(key: string, entry: FormDataEntryValue) {
    if (entry && typeof entry !== 'string') {
      // File object, not supported
      return undefined;
    } else {
      return parseEntry(key, entry, entityInfo.typeInfo[key]);
    }
  }

  for (const key of fields) {
    const typeInfo = entityInfo.typeInfo[key];
    const entries = data.getAll(key);

    if (!(typeInfo.zodType instanceof ZodArray)) {
      output[key] = parseSingleEntry(key, entries[0]);
    } else {
      output[key] = entries.map((e) => parseSingleEntry(key, e));
    }
  }

  function parseEntry(
    field: string,
    value: string | null,
    typeInfo: ZodTypeInfo
  ): unknown {
    const newValue = valueOrDefault(field, value, false, true, typeInfo);

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
    } else if (zodType instanceof ZodDate) {
      return new Date(value ?? '');
    } else if (zodType instanceof ZodBoolean) {
      return Boolean(value).valueOf();
    } else if (zodType instanceof ZodArray) {
      const arrayType = zodTypeInfo(zodType._def.type);
      return parseEntry(field, value, arrayType);
    } else if (zodType instanceof ZodLiteral) {
      const literalType = typeof zodType.value;

      if (literalType === 'string') return value;
      else if (literalType === 'number') return parseFloat(value ?? '');
      else if (literalType === 'boolean') return Boolean(value).valueOf();
      else {
        throw new Error('Unsupported ZodLiteral type: ' + literalType);
      }
    } else if (
      zodType instanceof ZodUnion ||
      zodType instanceof ZodEnum ||
      zodType instanceof ZodAny
    ) {
      return value;
    } else if (zodType instanceof ZodBigInt) {
      try {
        return BigInt(value ?? '.');
      } catch {
        return NaN;
      }
    }

    throw new Error(
      'Unsupported Zod default type: ' + zodType.constructor.name
    );
  }

  return output as z.infer<T>;
}

function valueOrDefault<T extends AnyZodObject>(
  field: keyof z.infer<T>,
  value: unknown,
  strict: boolean,
  implicitDefaults: boolean,
  typeInfo: ZodTypeInfo
) {
  if (value) return value;

  const { zodType, isNullable, isOptional, defaultValue } = typeInfo;

  // Based on schema type, check what the empty value should be parsed to
  function emptyValue() {
    // For convenience, make undefined into nullable if possible.
    // otherwise all nullable fields requires a default value or optional.
    // In the database, null is assumed if no other value (undefined doesn't exist there),
    // so this should be ok.
    // Also make a check for strict, so empty strings from FormData can also be set here.
    if (strict && value !== undefined) return value;
    if (defaultValue !== undefined) return defaultValue;
    if (isNullable) return null;
    if (isOptional) return undefined;

    if (implicitDefaults) {
      if (zodType instanceof ZodString) return '';
      if (zodType instanceof ZodNumber) return 0;
      if (zodType instanceof ZodBoolean) return false;
      if (zodType instanceof ZodArray) return [];
      if (zodType instanceof ZodObject) return {};
      if (zodType instanceof ZodBigInt) return BigInt(0);
      if (zodType instanceof ZodSymbol) return Symbol();
    }

    throw new Error(
      `Unsupported type for ${strict ? 'strict' : 'falsy'} ${
        implicitDefaults ? 'implicit' : 'explicit'
      } values on field "${String(field)}": ${
        zodType.constructor.name
      }. Add default, optional or nullable to the schema.`
    );
  }

  return emptyValue();
}

/**
 * Validates a Zod schema for usage in a SvelteKit form.
 * @param data Data structure for a Zod schema, or RequestEvent/FormData. If falsy, defaultEntity will be used.
 * @param schema The Zod schema to validate against.
 * @param options.defaults An object with keys that can be a default value, or a function that will be called to get the default value.
 * @param options.noErrors For load requests, this is usually set to prevent validation errors from showing directly on a GET request.
 */
export async function superValidate<T extends AnyZodObject>(
  data:
    | RequestEvent
    | Request
    | FormData
    | Partial<z.infer<T>>
    | null
    | undefined,
  schema: T,
  options: DefaultEntityOptions<T> & {
    noErrors?: boolean;
  } = {}
): Promise<Validation<T>> {
  options = { ...options };

  const schemaKeys = Object.keys(schema.keyof().Values);
  const entityInfo = entityData(schema);

  function emptyEntity() {
    return {
      valid: false,
      errors: {},
      data: entityInfo.defaultEntity,
      empty: true,
      message: null,
      constraints: entityInfo.constraints
    };
  }

  function parseSuperJson(data: FormData) {
    if (data.has('__superform_json')) {
      const output = parse(data.get('__superform_json')?.toString() ?? '');
      if (typeof output === 'object')
        return output as Record<string, unknown>;
      else throw 'Invalid superform JSON type';
    }
    return null;
  }

  function parseFormData(data: FormData) {
    const superJson = parseSuperJson(data);
    return superJson
      ? superJson
      : formDataToValidation(schema, schemaKeys, data);
  }

  async function tryParseFormData(request: Request) {
    let formData: FormData | undefined = undefined;
    try {
      formData = await request.formData();
    } catch {
      return null;
    }
    return parseFormData(formData);
  }

  if (!data) {
    return emptyEntity();
  } else if (data instanceof FormData) {
    data = parseFormData(data);
  } else if (data instanceof Request) {
    data = await tryParseFormData(data);
  } else if ('request' in data && data.request instanceof Request) {
    data = await tryParseFormData(data.request);
  }

  if (!data) return emptyEntity();

  const status = schema.safeParse(data);

  if (!status.success) {
    const errors = options.noErrors
      ? {}
      : (status.error.flatten().fieldErrors as ValidationErrors<T>);

    const parsedData = data as Partial<z.infer<T>>;

    return {
      valid: false,
      errors,
      data: Object.fromEntries(
        schemaKeys.map((key) => [
          key,
          parsedData[key] === undefined
            ? entityInfo.defaultEntity[key]
            : parsedData[key]
        ])
      ),
      empty: false,
      message: null,
      constraints: entityInfo.constraints
    };
  } else {
    return {
      valid: true,
      errors: {},
      data: status.data,
      empty: false,
      message: null,
      constraints: entityInfo.constraints
    };
  }
}

export function actionResult<T extends Record<string, unknown> | string>(
  type: T extends string ? 'redirect' : 'success' | 'failure' | 'error',
  data?: T,
  status?: number
) {
  const result = <T extends { status: number }>(struct: T) => {
    return json({ type, ...struct }, { status: struct.status });
  };

  if (type == 'error') {
    return result({
      status: status || 500,
      error: data
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
