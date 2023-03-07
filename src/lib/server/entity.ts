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

export type ZodTypeInfo = {
  zodType: ZodTypeAny;
  isNullable: boolean;
  isOptional: boolean;
  defaultValue: unknown;
};

type EntityRecord<T extends AnyZodObject, K> = Record<keyof z.infer<T>, K>;

//////////////////////////////////////////////////////////////////////////////

export type EntityMetaData<T extends AnyZodObject> = {
  types: EntityRecord<T, string>;
};

export type Entity<T extends AnyZodObject> = {
  typeInfo: EntityRecord<T, ZodTypeInfo>;
  defaultEntity: z.infer<T>;
  constraints: EntityRecord<T, InputConstraints | undefined>;
  meta: EntityMetaData<T>;
};

export function entityData<T extends AnyZodObject>(schema: T) {
  const cached = getCached(schema);
  if (cached) return cached;

  const typeInfos = typeInfo(schema);
  const defaultEnt = defaultEntity(schema);
  const entity: Entity<T> = {
    typeInfo: typeInfos,
    defaultEntity: defaultEnt,
    constraints: constraints(schema, typeInfos),
    meta: meta(schema)
  };

  setCached(schema, entity);
  return entity;
}

function setCached<T extends AnyZodObject>(schema: T, entity: Entity<T>) {
  entityCache.set(schema, entity);
}

function getCached<T extends AnyZodObject>(schema: T) {
  return entityCache.get(schema) as Entity<T>;
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

export function checkMissingFields<T extends AnyZodObject>(
  schema: T,
  data: Partial<z.infer<T>> | null | undefined
) {
  const entity = entityData(schema);

  const missingFields = Object.keys(entity.constraints).filter(
    (field) =>
      entity.constraints[field]?.required &&
      entity.defaultEntity[field] === undefined &&
      (!data || data[field] === undefined || data[field] === null)
  );

  if (missingFields.length) {
    const errors = missingFields.map(
      (field) =>
        `"${String(field)}" (${
          entity.typeInfo[field].zodType.constructor.name
        })`
    );
    throw new Error(
      `Unsupported default value for schema field(s): ${errors.join(
        ', '
      )}. Add default, optional or nullable to those fields in the schema.`
    );
  }
}

export function valueOrDefault(
  value: unknown,
  strict: boolean,
  implicitDefaults: true,
  typeInfo: ZodTypeInfo
) {
  if (value) return value;

  const { zodType, isNullable, isOptional, defaultValue } = typeInfo;

  // Based on schema type, check what the empty value should be parsed to

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

  return undefined;
}

/**
 * Returns the default values for a zod validation schema.
 * The main gotcha is that undefined values are changed to null if the field is nullable.
 */
export function defaultEntity<T extends AnyZodObject>(
  schema: T
): z.infer<T> {
  const fields = Object.keys(schema.keyof().Values);

  let output: Record<string, unknown> = {};
  let defaultKeys: string[] | undefined;

  const schemaTypeInfo = typeInfo(schema);

  // Need to set empty properties after defaults are set.
  output = Object.fromEntries(
    fields.map((field) => {
      const typeInfo = schemaTypeInfo[field];
      const newValue =
        defaultKeys && defaultKeys.includes(field)
          ? output[field]
          : valueOrDefault(undefined, true, true, typeInfo);

      return [field, newValue];
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

    if (!info.isNullable && !info.isOptional) {
      output.required = true;
    }

    return Object.keys(output).length > 0 ? output : undefined;
  }

  return _mapSchema(
    schema,
    (_, key) => {
      return constraint(key, typeInfo[key]);
    },
    (constraint) => !!constraint
  );
}

function meta<T extends AnyZodObject>(schema: T) {
  return {
    types: _mapSchema(schema, (obj) => {
      let type = zodTypeInfo(obj).zodType;
      let name = '';
      let depth = 0;
      while (type instanceof ZodArray) {
        name += 'ZodArray<';
        depth++;
        type = type._def.type;
      }
      return name + type.constructor.name + '>'.repeat(depth);
    })
  };
}

///////////////////////////////////////////////////////////////////////////

function _mapSchema<T extends AnyZodObject, S>(
  schema: T,
  factory: (obj: AnyZodObject, key: string) => S,
  filter?: (data: S) => boolean
) {
  const keys = schema.keyof().Values;
  return Object.fromEntries(
    Object.keys(keys)
      .map((key) => [key, factory(schema.shape[key], key)] as const)
      .filter((entry) => (filter ? filter(entry[1]) : true))
  ) as EntityRecord<T, S>;
}

///////////////////////////////////////////////////////////////////////////
