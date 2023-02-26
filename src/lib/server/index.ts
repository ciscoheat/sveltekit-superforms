import { fail, json, type RequestEvent } from '@sveltejs/kit';
import { parse, stringify } from 'devalue';
import type { Validation, ValidationErrors } from '..';

import {
  z,
  type ZodTypeAny,
  type AnyZodObject,
  ZodAny,
  ZodDefault,
  ZodNullable,
  ZodOptional,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDate,
  ZodLiteral,
  ZodUnion,
  ZodArray,
  ZodEffects,
  ZodBigInt,
  ZodObject,
  ZodSymbol,
  ZodEnum
} from 'zod';

type DefaultFields<T extends AnyZodObject> = Partial<{
  [Property in keyof z.infer<T>]:
    | z.infer<T>[Property]
    | ((
        value: z.infer<T>[Property] | null | undefined,
        data: z.infer<T>
      ) => z.infer<T>[Property] | null | undefined);
}>;

function setValidationDefaults<T extends AnyZodObject>(
  data: z.infer<T>,
  fields: DefaultFields<T>
) {
  for (const stringField of Object.keys(fields)) {
    const field = stringField as keyof typeof data;
    const currentData = data[field];

    if (typeof fields[field] === 'function') {
      // eslint-disable-next-line @typescript-eslint/ban-types
      const func = fields[field] as Function;
      data[field] = func(currentData, data);
    } else if (!currentData) {
      data[field] = fields[field] as never;
    }
  }
}

type EntityInfo<T extends AnyZodObject> = Record<
  keyof z.infer<T>,
  ReturnType<typeof zodTypeInfo>
>;

const entityInfoCache: WeakMap<
  AnyZodObject,
  EntityInfo<AnyZodObject>
> = new WeakMap<AnyZodObject, EntityInfo<AnyZodObject>>();

function entityTypeInfo<T extends AnyZodObject>(schema: T) {
  if (entityInfoCache.has(schema))
    return entityInfoCache.get(schema) as EntityInfo<T>;

  const keys = schema.keyof().Values;
  const info = Object.fromEntries(
    Object.keys(keys).map((key) => [key, zodTypeInfo(schema.shape[key])])
  );

  entityInfoCache.set(schema, info);
  return info as EntityInfo<T>;
}

const defaultEntityCache: WeakMap<
  AnyZodObject,
  z.infer<AnyZodObject>
> = new WeakMap<AnyZodObject, z.infer<AnyZodObject>>();

/**
 * Returns the default values for a zod validation schema.
 * The main gotcha is that undefined values are changed to null if the field is nullable.
 */
export function defaultEntity<T extends AnyZodObject>(
  schema: T,
  options: {
    defaults?: DefaultFields<T>;
    implicitDefaults?: boolean;
  } = {}
): z.infer<T> {
  options = { ...options };

  if (
    defaultEntityCache &&
    !options.defaults &&
    defaultEntityCache.has(schema)
  ) {
    return defaultEntityCache.get(schema) as z.infer<T>;
  }

  const fields = Object.keys(schema.keyof().Values);

  let output: Record<string, unknown> = {};
  let defaultKeys: string[] | undefined;

  if (options.defaults) {
    setValidationDefaults(output, options.defaults);
    defaultKeys = Object.keys(options.defaults);
  }

  const schemaTypeInfo = entityTypeInfo(schema);

  // Need to set empty properties after defaults are set.
  output = Object.fromEntries(
    fields.map((field) => {
      const typeInfo = schemaTypeInfo[field];
      const value =
        defaultKeys && defaultKeys.includes(field)
          ? output[field]
          : valueOrDefault(
              field,
              undefined,
              true,
              options.implicitDefaults ?? true,
              typeInfo
            );

      return [field, value];
    })
  );

  if (
    defaultEntityCache &&
    !options.defaults &&
    !defaultEntityCache.has(schema)
  ) {
    defaultEntityCache.set(schema, output);
  }

  return output;
}

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
  const entityInfo = entityTypeInfo(schema);

  function parseSingleEntry(key: string, entry: FormDataEntryValue) {
    if (entry && typeof entry !== 'string') {
      // File object, not supported
      return undefined;
    } else {
      return parseEntry(key, entry, entityInfo[key]);
    }
  }

  for (const key of fields) {
    const typeInfo = entityInfo[schema.shape[key]];
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
    typeInfo: ReturnType<typeof zodTypeInfo>
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

type ZodTypeInfo = {
  zodType: ZodTypeAny;
  isNullable: boolean;
  isOptional: boolean;
  defaultValue: unknown;
};

function zodTypeInfo(zodType: ZodTypeAny): ZodTypeInfo {
  let _wrapped = true;
  let isNullable = false;
  let isOptional = false;
  let defaultValue: unknown = undefined;

  //let i = 0;
  while (_wrapped) {
    //console.log(' '.repeat(++i * 2) + zodType.constructor.name);
    if (zodType instanceof ZodNullable) {
      isNullable = true;
      zodType = zodType.unwrap();
    } else if (zodType instanceof ZodDefault) {
      defaultValue = zodType._def.defaultValue();
      zodType = zodType._def.innerType;
    } else if (zodType instanceof ZodOptional) {
      isOptional = true;
      zodType = zodType.unwrap();
    } else if (zodType instanceof ZodEffects) {
      zodType = zodType._def.schema;
    } else {
      _wrapped = false;
    }
  }

  return {
    zodType,
    isNullable,
    isOptional,
    defaultValue
  };
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

function _constraint(key: string, info: ZodTypeInfo) {
  const zodType = info.zodType;
  const required = !info.isNullable && !info.isOptional;
  if (zodType instanceof ZodString) {
    const patterns = zodType._def.checks.filter((f) => f.kind == 'regex');

    if (patterns.length > 1) {
      throw new Error(
        `Error on field "${key}": Only one regex is allowed per field.`
      );
    }

    const pattern =
      patterns.length == 1 && patterns[0].kind == 'regex'
        ? patterns[0]
        : undefined;

    return {
      pattern: pattern?.regex.source,
      minlength: zodType.minLength ?? undefined,
      maxlength: zodType.maxLength ?? undefined,
      required
    };
  }

  if (zodType instanceof ZodNumber) {
    const steps = zodType._def.checks.filter((f) => f.kind == 'multipleOf');

    if (steps.length > 1) {
      throw new Error(
        `Error on field "${key}": Only one multipleOf is allowed per field.`
      );
    }

    const step =
      steps.length == 1 && steps[0].kind == 'multipleOf'
        ? steps[0]
        : undefined;

    return {
      min: zodType.minValue ?? undefined,
      max: zodType.maxValue ?? undefined,
      step: step?.value,
      required
    };
  }

  if (zodType instanceof ZodDate) {
    return {
      min: zodType.minDate ?? undefined,
      max: zodType.maxDate ?? undefined,
      required
    };
  }

  return {
    required
  };
}

function inputConstraints<T extends AnyZodObject>(schema: T) {
  const entityInfo = entityTypeInfo(schema);
  return Object.fromEntries(
    Object.entries(entityInfo).map(([key, info]) => [
      key,
      _constraint(key, info)
    ])
  ) as NonNullable<Validation<T>['constraints']>;
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
  options: {
    defaults?: DefaultFields<T>;
    implicitDefaults?: boolean;
    noErrors?: boolean;
  } = {}
): Promise<Validation<T>> {
  options = { ...options };

  const schemaKeys = Object.keys(schema.keyof().Values);

  const constraints = inputConstraints(schema);

  function emptyEntity() {
    return {
      valid: false,
      errors: {},
      data: defaultEntity(schema, options),
      empty: true,
      message: null,
      constraints
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
    const formData = await request.formData();
    return parseFormData(formData);
  }

  try {
    if (!data) {
      return emptyEntity();
    } else if (data instanceof FormData) {
      data = parseFormData(data);
    } else if (data instanceof Request) {
      data = await tryParseFormData(data);
    } else if ('request' in data && data.request instanceof Request) {
      data = await tryParseFormData(data.request);
    }
  } catch (e) {
    return emptyEntity();
  }

  const status = schema.safeParse(data);

  if (!status.success) {
    const errors = options.noErrors
      ? {}
      : (status.error.flatten().fieldErrors as ValidationErrors<T>);

    const parsedData = data as Partial<z.infer<T>>;
    const defEntity = defaultEntity(schema, options);

    return {
      valid: false,
      errors,
      data: Object.fromEntries(
        schemaKeys.map((key) => [
          key,
          parsedData[key] === undefined ? defEntity[key] : parsedData[key]
        ])
      ),
      empty: false,
      message: null,
      constraints
    };
  } else {
    return {
      valid: true,
      errors: {},
      data: status.data,
      empty: false,
      message: null,
      constraints
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
