import {
  type InputConstraints,
  type InputConstraint,
  type ZodValidation,
  type UnwrapEffects,
  SuperFormError
} from './index.js';

import { errorShape } from './errors.js';

import type {
  z,
  ZodTypeAny,
  AnyZodObject,
  ZodDefault,
  ZodNullable,
  ZodOptional,
  ZodEffects,
  ZodString,
  ZodNumber,
  ZodDate,
  ZodArray,
  ZodPipeline
} from 'zod';

import type { SuperValidateOptions } from './superValidate.js';
import type { ErrorShape } from './errors.js';

export type ZodTypeInfo = {
  zodType: ZodTypeAny;
  originalType: ZodTypeAny;
  isNullable: boolean;
  isOptional: boolean;
  hasDefault: boolean;
  effects: ZodEffects<ZodTypeAny> | undefined;
  defaultValue: unknown;
};

export type UnwrappedEntity<T> = T extends infer R
  ? R extends ZodOptional<infer U>
    ? UnwrappedEntity<U>
    : R extends ZodDefault<infer U>
    ? UnwrappedEntity<U>
    : R extends ZodNullable<infer U>
    ? UnwrappedEntity<U>
    : R extends ZodEffects<infer U>
    ? UnwrappedEntity<U>
    : R
  : never;

type EntityRecord<T extends AnyZodObject, K> = Record<keyof z.infer<T>, K>;

//////////////////////////////////////////////////////////////////////////////

export type EntityMetaData<T extends AnyZodObject> = {
  types: EntityRecord<T, string>;
};

export type Entity<T extends AnyZodObject> = {
  typeInfo: EntityRecord<T, ZodTypeInfo>;
  defaultEntity: z.infer<T>;
  constraints: InputConstraints<T>;
  keys: string[];
  hash: string;
  errorShape: ErrorShape;
};

export function hasEffects(zodType: ZodTypeAny): boolean {
  const type = unwrapZodType(zodType);
  if (type.effects) return true;

  const name = type.zodType._def.typeName;

  if (name == 'ZodObject') {
    const obj = type.zodType as AnyZodObject;
    for (const field of Object.values(obj._def.shape())) {
      if (hasEffects(field as ZodTypeAny)) return true;
    }
  } else if (name == 'ZodArray') {
    const array = type.zodType as ZodArray<ZodTypeAny>;
    return hasEffects(array.element);
  }

  return false;
}

export function unwrapZodType(zodType: ZodTypeAny): ZodTypeInfo {
  const originalType = zodType;

  let _wrapped = true;
  let isNullable = false;
  let isOptional = false;
  let hasDefault = false;
  let effects = undefined;
  let defaultValue: unknown = undefined;

  //let i = 0;
  while (_wrapped) {
    //console.log(' '.repeat(++i * 2) + zodType.constructor.name);
    if (zodType._def.typeName == 'ZodNullable') {
      isNullable = true;
      zodType = (zodType as ZodNullable<ZodTypeAny>).unwrap();
    } else if (zodType._def.typeName == 'ZodDefault') {
      hasDefault = true;
      defaultValue = zodType._def.defaultValue();
      zodType = zodType._def.innerType;
    } else if (zodType._def.typeName == 'ZodOptional') {
      isOptional = true;
      zodType = (zodType as ZodOptional<ZodTypeAny>).unwrap();
    } else if (zodType._def.typeName == 'ZodEffects') {
      if (!effects) effects = zodType as ZodEffects<ZodTypeAny>;
      zodType = zodType._def.schema;
    } else if (zodType._def.typeName == 'ZodPipeline') {
      zodType = (zodType as ZodPipeline<ZodTypeAny, ZodTypeAny>)._def.out;
    } else {
      _wrapped = false;
    }
  }

  return {
    zodType,
    originalType,
    isNullable,
    isOptional,
    hasDefault,
    defaultValue,
    effects
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

export function entityHash<T extends AnyZodObject>(schema: T) {
  //console.log(_entityHash(schema));
  return hashCode(_entityHash(schema));
}

export function _entityHash<T extends ZodTypeAny>(type: T) {
  let hash = '';
  const unwrapped = unwrapZodType(type);

  switch (unwrapped.zodType._def.typeName) {
    case 'ZodObject': {
      for (const [field, zodType] of Object.entries(
        (unwrapped.zodType as AnyZodObject).shape
      )) {
        hash +=
          'ZodObject:' + field + ':' + _entityHash(zodType as ZodTypeAny);
      }
      break;
    }
    case 'ZodArray': {
      const inner = unwrapped.zodType as ZodArray<ZodTypeAny>;
      hash += 'ZodArray:' + _entityHash(inner.element);
      break;
    }
    default:
      hash += unwrapped.zodType._def.typeName;
  }

  return hash;
}

export function entityData<T extends AnyZodObject>(
  schema: T,
  warnings?: SuperValidateOptions<T>['warnings']
) {
  const cached = getCached(schema);
  if (cached) return cached;

  const entity: Entity<T> = {
    typeInfo: schemaInfo(schema),
    defaultEntity: defaultValues(schema),
    constraints: constraints(schema, warnings),
    keys: Object.keys(schema.keyof().Values),
    hash: entityHash(schema),
    errorShape: errorShape(schema)
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

  if (strict) return value;
  if (hasDefault) return defaultValue;
  if (isNullable) return null;
  if (isOptional) return undefined;

  if (zodType._def.typeName == 'ZodString') return '';
  if (zodType._def.typeName == 'ZodNumber') return 0;
  if (zodType._def.typeName == 'ZodBoolean') return false;
  // Cannot add default for ZodDate due to https://github.com/Rich-Harris/devalue/issues/51
  //if (zodType._def.typeName == "ZodDate") return new Date(NaN);
  if (zodType._def.typeName == 'ZodArray') return [];
  if (zodType._def.typeName == 'ZodObject') {
    return defaultValues(zodType as AnyZodObject);
  }
  if (zodType._def.typeName == 'ZodSet') return new Set();
  if (zodType._def.typeName == 'ZodRecord') return {};
  if (zodType._def.typeName == 'ZodBigInt') return BigInt(0);
  if (zodType._def.typeName == 'ZodSymbol') return Symbol();

  return undefined;
}

/**
 * Returns the default values for a zod validation schema.
 * The main gotcha is that undefined values are changed to null if the field is nullable.
 */
export function defaultValues<T extends ZodValidation<AnyZodObject>>(
  schema: T
): z.infer<UnwrapEffects<T>> {
  while (schema._def.typeName == 'ZodEffects') {
    schema = (schema as ZodEffects<T>)._def.schema;
  }

  if (!(schema._def.typeName == 'ZodObject')) {
    throw new SuperFormError(
      'Only Zod schema objects can be used with defaultValues. ' +
        'Define the schema with z.object({ ... }) and optionally refine/superRefine/transform at the end.'
    );
  }

  const realSchema = schema as UnwrapEffects<T>;
  const fields = Object.keys(realSchema.keyof().Values);
  const schemaTypeInfo = schemaInfo(realSchema);

  return Object.fromEntries(
    fields.map((field) => {
      const typeInfo = schemaTypeInfo[field];
      const newValue = valueOrDefault(undefined, false, typeInfo);

      return [field, newValue];
    })
  );
}

function constraints<T extends AnyZodObject>(
  schema: T,
  warnings: SuperValidateOptions<T>['warnings']
): InputConstraints<T> {
  function constraint(
    key: string,
    zodType: ZodTypeAny,
    info: ZodTypeInfo
  ): InputConstraint | undefined {
    const output: InputConstraint = {};

    if (zodType._def.typeName == 'ZodString') {
      const zodString = zodType as ZodString;
      const patterns = zodString._def.checks.filter(
        (f) => f.kind == 'regex'
      );

      if (patterns.length > 1 && warnings?.multipleRegexps !== false) {
        console.warn(
          `Field "${key}" has more than one regexp, only the first one will be used in constraints. Set the warnings.multipleRegexps option to false to disable this warning.`
        );
      }

      const pattern =
        patterns.length > 0 && patterns[0].kind == 'regex'
          ? patterns[0].regex.source
          : undefined;

      if (pattern) output.pattern = pattern;
      if (zodString.minLength !== null)
        output.minlength = zodString.minLength;
      if (zodString.maxLength !== null)
        output.maxlength = zodString.maxLength;
    } else if (zodType._def.typeName == 'ZodNumber') {
      const zodNumber = zodType as ZodNumber;
      const steps = zodNumber._def.checks.filter(
        (f) => f.kind == 'multipleOf'
      );

      if (steps.length > 1 && warnings?.multipleSteps !== false) {
        console.warn(
          `Field "${key}" has more than one step, only the first one will be used in constraints. Set the warnings.multipleSteps option to false to disable this warning.`
        );
      }

      const step =
        steps.length > 0 && steps[0].kind == 'multipleOf'
          ? steps[0].value
          : null;

      if (zodNumber.minValue !== null) output.min = zodNumber.minValue;
      if (zodNumber.maxValue !== null) output.max = zodNumber.maxValue;
      if (step !== null) output.step = step;
    } else if (zodType._def.typeName == 'ZodDate') {
      const zodDate = zodType as ZodDate;
      if (zodDate.minDate) output.min = zodDate.minDate.toISOString();
      if (zodDate.maxDate) output.max = zodDate.maxDate.toISOString();
    } else if (zodType._def.typeName == 'ZodArray') {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapField(key: string, value: ZodTypeAny): any {
    const info = unwrapZodType(value);
    value = info.zodType;
    if (value._def.typeName == 'ZodArray') {
      return mapField(key, value._def.type);
    } else if (value._def.typeName == 'ZodObject') {
      return constraints(value as AnyZodObject, warnings);
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
