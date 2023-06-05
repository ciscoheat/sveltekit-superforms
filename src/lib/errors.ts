import type { ValidationErrors } from './index.js';
import type {
  ZodTypeAny,
  AnyZodObject,
  ZodFormattedError,
  ZodArray,
  ZodRecord,
  ZodUnion
} from 'zod';
import { mergePath } from './stringPath.js';
import { unwrapZodType } from './schemaEntity.js';

/**
 * A tree structure where the existence of a node means that its not a leaf.
 * Used in error mapping to determine whether to add errors to an _error field
 * (as in arrays and objects), or directly on the field itself.
 */
export type ErrorShape = {
  [K in string]: ErrorShape;
};

const _cachedErrorShapes = new WeakMap<AnyZodObject, ErrorShape>();

export function errorShape(schema: AnyZodObject): ErrorShape {
  if (!_cachedErrorShapes.has(schema)) {
    _cachedErrorShapes.set(schema, _errorShape(schema) as ErrorShape);
  }

  // Can be casted since it guaranteed to be an object
  return _cachedErrorShapes.get(schema) as ErrorShape;
}

function _errorShape(type: ZodTypeAny): ErrorShape | undefined {
  const unwrapped = unwrapZodType(type).zodType;
  if (unwrapped._def.typeName == 'ZodObject') {
    return Object.fromEntries(
      Object.entries((unwrapped as AnyZodObject).shape)
        .map(([key, value]) => {
          return [key, _errorShape(value as ZodTypeAny)];
        })
        .filter((entry) => entry[1] !== undefined)
    );
  } else if (unwrapped._def.typeName == 'ZodArray') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return _errorShape((unwrapped as ZodArray<any, any>)._def.type) ?? {};
  } else if (unwrapped._def.typeName == 'ZodRecord') {
    return _errorShape((unwrapped as ZodRecord)._def.valueType) ?? {};
  } else if (unwrapped._def.typeName == 'ZodUnion') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = (unwrapped as ZodUnion<any>)._def
      .options as ZodTypeAny[];
    return options.reduce((shape, next) => {
      const nextShape = _errorShape(next);
      if (nextShape) shape = { ...(shape ?? {}), ...nextShape };
      return shape;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, undefined as any);
  }
  return undefined;
}

export function mapErrors<T extends AnyZodObject>(
  obj: ZodFormattedError<unknown>,
  errorShape: ErrorShape | undefined,
  inObject = true
) {
  /*
  console.log('====================================================');
  console.dir(obj, { depth: 7 });
  console.log('----------------------------------------------------');
  console.dir(errorShape, { depth: 7 });
  */

  const output: Record<string, unknown> = {};
  const entries = Object.entries(obj);

  if ('_errors' in obj && obj._errors.length) {
    // Check if we are at the end of a node
    if (!errorShape || !inObject) {
      return obj._errors as unknown as ValidationErrors<T>;
    } else {
      output._errors = obj._errors;
    }
  }

  for (const [key, value] of entries.filter(([key]) => key !== '_errors')) {
    // Keep current errorShape if the object key is numeric
    // which means we are in an array.
    const numericKey = !isNaN(parseInt(key, 10));

    // _errors are filtered out, so casting is fine
    output[key] = mapErrors(
      value as unknown as ZodFormattedError<unknown>,
      errorShape ? (numericKey ? errorShape : errorShape[key]) : undefined,
      !!errorShape?.[key] // We're not in an object if there is no key in the ErrorShape
    );
  }

  return output as ValidationErrors<T>;
}

export function flattenErrors(errors: ValidationErrors<AnyZodObject>) {
  return _flattenErrors(errors, []);
}

function _flattenErrors(
  errors: ValidationErrors<AnyZodObject>,
  path: string[]
): { path: string; messages: string[] }[] {
  const entries = Object.entries(errors);
  return entries
    .filter(([, value]) => value !== undefined)
    .flatMap(([key, messages]) => {
      if (Array.isArray(messages) && messages.length > 0) {
        const currPath = path.concat([key]);
        return { path: mergePath(currPath), messages };
      } else {
        return _flattenErrors(
          errors[key] as ValidationErrors<AnyZodObject>,
          path.concat([key])
        );
      }
    });
}
