import type { InputConstraints } from '..';

import {
  z,
  type ZodTypeAny,
  type AnyZodObject,
  ZodDefault,
  ZodNullable,
  ZodOptional,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDate,
  ZodArray,
  ZodEffects,
  ZodBigInt,
  ZodObject,
  ZodSymbol
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

export type ZodTypeInfo = {
  zodType: ZodTypeAny;
  isNullable: boolean;
  isOptional: boolean;
  defaultValue: unknown;
};

type EntityRecord<T extends AnyZodObject, K> = Record<keyof z.infer<T>, K>;

export type DefaultEntityOptions<T extends AnyZodObject> = {
  defaults?: DefaultFields<T>;
  implicitDefaults?: boolean;
};

//////////////////////////////////////////////////////////////////////////////

type EntityMetaData<T extends AnyZodObject> = {
  types: EntityRecord<T, string>;
};

type Entity<T extends AnyZodObject> = {
  typeInfo: EntityRecord<T, ZodTypeInfo>;
  defaultEntity: z.infer<T>;
  constraints: EntityRecord<T, InputConstraints | undefined>;
  meta: EntityMetaData<T>;
};

export function entityData<T extends AnyZodObject>(
  schema: T,
  options: DefaultEntityOptions<T> = {}
) {
  if (entityCache.has(schema)) return entityCache.get(schema) as Entity<T>;

  const typeInfos = typeInfo(schema);
  const entity: Entity<T> = {
    typeInfo: typeInfos,
    defaultEntity: defaultEntity(schema, options),
    constraints: constraints(schema, typeInfos),
    meta: meta(schema)
  };
  entityCache.set(schema, entity);
  return entity;
}

const entityCache: WeakMap<AnyZodObject, Entity<AnyZodObject>> = new WeakMap<
  AnyZodObject,
  Entity<AnyZodObject>
>();

///// Factory functions for Entity ///////////////////////////////////////////

export function zodTypeInfo(zodType: ZodTypeAny): ZodTypeInfo {
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

function typeInfo<T extends AnyZodObject>(schema: T) {
  return _mapSchema(schema, (obj) => zodTypeInfo(obj));
}

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

  options = { ...options };

  const fields = Object.keys(schema.keyof().Values);

  let output: Record<string, unknown> = {};
  let defaultKeys: string[] | undefined;

  if (options.defaults) {
    setValidationDefaults(output, options.defaults);
    defaultKeys = Object.keys(options.defaults);
  }

  const schemaTypeInfo = typeInfo(schema);

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

  return output;
}

function constraints<T extends AnyZodObject>(
  schema: T,
  typeInfo: EntityRecord<T, ZodTypeInfo>
) {
  function constraint(
    key: string,
    info: ZodTypeInfo
  ): InputConstraints | undefined {
    const zodType = info.zodType;

    const output: InputConstraints = {};

    if (zodType instanceof ZodString) {
      const patterns = zodType._def.checks.filter((f) => f.kind == 'regex');

      if (patterns.length > 1) {
        throw new Error(
          `Error on field "${key}": Only one regex is allowed per field.`
        );
      }

      const pattern =
        patterns.length == 1 && patterns[0].kind == 'regex'
          ? patterns[0].regex.source
          : undefined;

      if (pattern) output.pattern = pattern;
      if (zodType.minLength !== null) output.minlength = zodType.minLength;
      if (zodType.maxLength !== null) output.maxlength = zodType.maxLength;
    } else if (zodType instanceof ZodNumber) {
      const steps = zodType._def.checks.filter(
        (f) => f.kind == 'multipleOf'
      );

      if (steps.length > 1) {
        throw new Error(
          `Error on field "${key}": Only one multipleOf is allowed per field.`
        );
      }

      const step =
        steps.length == 1 && steps[0].kind == 'multipleOf'
          ? steps[0].value
          : null;

      if (zodType.minValue !== null) output.min = zodType.minValue;
      if (zodType.maxValue !== null) output.max = zodType.maxValue;
      if (step !== null) output.step = step;
    } else if (zodType instanceof ZodDate) {
      if (zodType.minDate) output.min = zodType.minDate.toISOString();
      if (zodType.maxDate) output.max = zodType.maxDate.toISOString();
    }

    if (!info.isNullable && !info.isOptional) output.required = true;

    return Object.keys(output).length > 0 ? output : undefined;
  }

  return _mapSchema(schema, (_, key) => {
    return constraint(key, typeInfo[key]);
  });
}

function meta<T extends AnyZodObject>(schema: T) {
  return {
    types: _mapSchema(
      schema,
      (obj) => zodTypeInfo(obj).zodType.constructor.name
    )
  };
}

///////////////////////////////////////////////////////////////////////////

function _mapSchema<T extends AnyZodObject, S>(
  schema: T,
  factory: (obj: AnyZodObject, key: string) => S
) {
  const keys = schema.keyof().Values;
  return Object.fromEntries(
    Object.keys(keys).map((key) => [key, factory(schema.shape[key], key)])
  ) as EntityRecord<T, S>;
}

///////////////////////////////////////////////////////////////////////////
