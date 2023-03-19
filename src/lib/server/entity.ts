import {
  SuperFormError,
  type InputConstraints,
  type InputConstraint
} from '..';

import type { ZodTypeInfo } from '../entity';

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

export type UnwrappedEntity<T> = T extends ZodOptional<infer U>
  ? UnwrappedEntity<U>
  : T extends ZodDefault<infer U>
  ? UnwrappedEntity<U>
  : T extends ZodNullable<infer U>
  ? UnwrappedEntity<U>
  : T extends ZodEffects<infer U>
  ? UnwrappedEntity<U>
  : T;

type EntityRecord<T extends AnyZodObject, K> = Record<keyof z.infer<T>, K>;

//////////////////////////////////////////////////////////////////////////////

export type EntityMetaData<T extends AnyZodObject> = {
  types: EntityRecord<T, string>;
};

export type Entity<T extends AnyZodObject> = {
  typeInfo: EntityRecord<T, ZodTypeInfo>;
  defaultEntity: z.infer<T>;
  constraints: InputConstraints<T>;
  meta: EntityMetaData<T>;
  hash: string;
  keys: string[];
};

export function unwrapZodType(zodType: ZodTypeAny): ZodTypeInfo {
  let _wrapped = true;
  let isNullable = false;
  let isOptional = false;
  let hasDefault = false;
  let defaultValue: unknown = undefined;

  //let i = 0;
  while (_wrapped) {
    //console.log(' '.repeat(++i * 2) + zodType.constructor.name);
    if (zodType instanceof ZodNullable) {
      isNullable = true;
      zodType = zodType.unwrap();
    } else if (zodType instanceof ZodDefault) {
      hasDefault = true;
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
    hasDefault,
    defaultValue
  };
}

// https://stackoverflow.com/a/8831937/70894
function hashCode(str: string) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  // Make it unsigned, for the hash appearance
  if (hash < 0) hash = hash >>> 0;
  return hash.toString(36);
}

export function entityHash<T extends AnyZodObject>(meta: EntityMetaData<T>) {
  return hashCode(JSON.stringify(meta.types));
}

export function entityData<T extends AnyZodObject>(schema: T) {
  const cached = getCached(schema);
  if (cached) return cached;

  const typeInfos = schemaInfo(schema);
  const defaultEnt = defaultEntity(schema);
  const metaData = meta(schema);
  const entity: Entity<T> = {
    typeInfo: typeInfos,
    defaultEntity: defaultEnt,
    constraints: constraints(schema),
    meta: metaData,
    hash: entityHash(metaData),
    keys: Object.keys(schema.keyof().Values)
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

function schemaInfo<T extends AnyZodObject>(schema: T) {
  return _mapSchema(schema, (obj) => unwrapZodType(obj));
}

export function valueOrDefault(
  value: unknown,
  strict: boolean,
  implicitDefaults: true,
  schemaInfo: ZodTypeInfo
) {
  if (value) return value;

  const { zodType, isNullable, isOptional, hasDefault, defaultValue } =
    schemaInfo;

  // Based on schema type, check what the empty value should be parsed to

  // For convenience, make undefined into nullable if possible.
  // otherwise all nullable fields requires a default value or optional.
  // In the database, null is assumed if no other value (undefined doesn't exist there),
  // so this should be ok.
  // Also make a check for strict, so empty strings from FormData can also be set here.

  if (strict && value !== undefined) return value;
  if (hasDefault) return defaultValue;
  if (isNullable) return null;
  if (isOptional) return undefined;

  if (implicitDefaults) {
    if (zodType instanceof ZodString) return '';
    if (zodType instanceof ZodNumber) return 0;
    if (zodType instanceof ZodBoolean) return false;
    if (zodType instanceof ZodArray) return [];
    if (zodType instanceof ZodObject) return defaultEntity(zodType);
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

  const schemaTypeInfo = schemaInfo(schema);

  // Need to set empty properties after defaults are set.
  output = Object.fromEntries(
    fields.map((field) => {
      const typeInfo = schemaTypeInfo[field];
      const newValue = valueOrDefault(undefined, true, true, typeInfo);

      return [field, newValue];
    })
  );

  return output;
}

function constraints<T extends AnyZodObject>(
  schema: T
): InputConstraints<T> {
  function constraint(
    key: string,
    zodType: ZodTypeAny,
    info: ZodTypeInfo
  ): InputConstraint | undefined {
    const output: InputConstraint = {};

    if (zodType instanceof ZodString) {
      const patterns = zodType._def.checks.filter((f) => f.kind == 'regex');

      if (patterns.length > 1) {
        throw new SuperFormError(
          `Invalid field "${key}": Only one regex is allowed per field.`
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
        throw new SuperFormError(
          `Invalid field "${key}": Only one multipleOf is allowed per field.`
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
    } else if (zodType instanceof ZodArray) {
      if (zodType._def.minLength) output.min = zodType._def.minLength.value;
      if (zodType._def.maxLength) output.max = zodType._def.maxLength.value;
      if (zodType._def.exactLength)
        output.min = output.max = zodType._def.exactLength.value;
    }

    if (!info.isNullable && !info.isOptional) {
      output.required = true;
    }

    return Object.keys(output).length > 0 ? output : undefined;
  }

  function mapField(key: string, value: ZodTypeAny): any {
    const info = unwrapZodType(value);
    value = info.zodType;
    if (value instanceof ZodArray) {
      return mapField(key, value._def.type);
      /*_constraints: constraint(key, value, info)*/
    } else if (value instanceof ZodObject) {
      return constraints(value);
    } else {
      return constraint(key, value, info);
    }
  }

  return _mapSchema(
    schema,
    (obj, key) => {
      return mapField(key, obj);
    },
    (data) => !!data
  ) as InputConstraints<T>;
}

function meta<T extends AnyZodObject>(schema: T) {
  return {
    types: _mapSchema(schema, (obj) => {
      let type = unwrapZodType(obj).zodType;
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
