import { fail, json, type RequestEvent } from '@sveltejs/kit';
import { parse, stringify } from 'devalue';
import { SuperFormError, type Validation, type ValidationErrors } from '..';
import {
  checkMissingFields,
  entityData,
  valueOrDefault,
  zodTypeInfo,
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
  ZodEnum,
  ZodNativeEnum,
  ZodSymbol
} from 'zod';

export { defaultEntity } from './entity';

export function setError<T extends AnyZodObject, M = any>(
  form: Validation<T, M>,
  field: keyof z.infer<T>,
  error: string | string[] | null,
  options: { overwrite?: boolean; status?: number } = {
    overwrite: false,
    status: 400
  }
) {
  const errArr = Array.isArray(error) ? error : error ? [error] : [];

  if (form.errors[field] && !options.overwrite) {
    form.errors[field] = form.errors[field]?.concat(errArr);
  } else {
    form.errors[field] = errArr;
  }
  form.valid = false;
  return fail(options.status ?? 400, { form });
}

export function noErrors<T extends AnyZodObject, M = any>(
  form: Validation<T, M>
): Validation<T, M> {
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
      const arrayType = zodTypeInfo(zodType._def.type);
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

export type SuperValidateOptions<T extends AnyZodObject> = {
  noErrors?: boolean;
  includeMeta?: boolean;
  checkMissingEntityFields?: boolean;
  defaults?: DefaultFields<T>;
  id?: true | string;
};

/**
 * Validates a Zod schema for usage in a SvelteKit form.
 * @param data Data structure for a Zod schema, or RequestEvent/FormData. If falsy, the schema's defaultEntity will be used.
 * @param schema The Zod schema to validate against.
 * @param options.defaults An object with keys that can be a default value, or a function that will be called to get the default value.
 * @param options.noErrors For load requests, this is usually set to prevent validation errors from showing directly on a GET request.
 */
export async function superValidate<
  T extends AnyZodObject,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  data:
    | RequestEvent
    | Request
    | FormData
    | Partial<z.infer<T>>
    | null
    | undefined,
  schema: T,
  options: SuperValidateOptions<T> = {}
): Promise<Validation<T, M>> {
  options = {
    checkMissingEntityFields: true,
    noErrors: false,
    includeMeta: false,
    ...options
  };

  const entityInfo = entityData(schema);
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

  let checkMissing = true;

  // If FormData exists, don't check for missing fields.
  // Checking only at GET requests, basically, where
  // the data is coming from the DB.
  if (data instanceof FormData) {
    data = parseFormData(data);
    checkMissing = false;
  } else if (data instanceof Request) {
    data = await tryParseFormData(data);
    checkMissing = !data;
  } else if (data && data.request instanceof Request) {
    data = await tryParseFormData(data.request);
    checkMissing = !data;
  } else if (data) {
    // Make a copy of the data, so defaults can be applied to it.
    data = { ...data };
  }

  if (checkMissing && options.checkMissingEntityFields) {
    // Empty or Partial entity
    checkMissingFields(schema, data);
  }

  let output: Validation<T, M>;

  if (!data) {
    output = {
      valid: false,
      errors: {},
      // Copy the default entity so it's not modified
      data: { ...entityInfo.defaultEntity },
      empty: true,
      constraints: entityInfo.constraints
    };

    if (options.defaults) {
      setValidationDefaults(output.data, options.defaults);
    }
  } else {
    const partialData = data as Partial<z.infer<T>>;

    if (options.defaults) {
      setValidationDefaults(partialData, options.defaults);
    }

    const status = schema.safeParse(partialData);

    if (!status.success) {
      const errors = options.noErrors
        ? {}
        : (status.error.flatten().fieldErrors as ValidationErrors<T>);

      output = {
        valid: false,
        errors,
        data: Object.fromEntries(
          schemaKeys.map((key) => [
            key,
            partialData[key] === undefined
              ? entityInfo.defaultEntity[key]
              : partialData[key]
          ])
        ),
        empty: false,
        constraints: entityInfo.constraints
      };
    } else {
      output = {
        valid: true,
        errors: {},
        data: status.data,
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
  T extends Record<string, unknown> | App.Error | string
>(
  type: T extends string
    ? 'redirect' | 'error'
    : 'success' | 'failure' | 'error',
  data?: T,
  status?: number
) {
  const result = <T extends { status: number }>(struct: T) => {
    return json({ type, ...struct }, { status: struct.status });
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
