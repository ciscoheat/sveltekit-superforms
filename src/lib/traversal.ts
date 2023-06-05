import type { MaybePromise, ValidationErrors, FieldPath } from './index.js';
import type {
  ZodTypeAny,
  AnyZodObject,
  ZodFormattedError,
  ZodEffects,
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

export type ZodTypeInfo = {
  zodType: ZodTypeAny;
  originalType: ZodTypeAny;
  isNullable: boolean;
  isOptional: boolean;
  hasDefault: boolean;
  effects: ZodEffects<ZodTypeAny> | undefined;
  defaultValue: unknown;
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

export function findErrors(errors: ValidationErrors<AnyZodObject>) {
  return _findErrors(errors, []);
}

function _findErrors(
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
        return _findErrors(
          errors[key] as ValidationErrors<AnyZodObject>,
          path.concat([key])
        );
      }
    });
}

/* eslint-disable @typescript-eslint/no-explicit-any */

type PathData = {
  parent: any;
  key: string;
  value: any;
  path: string[];
  isLeaf: boolean;
  set: (value: any) => 'skip';
};

function setPath<T extends object>(parent: T, key: keyof T, value: any) {
  parent[key] = value;
  return 'skip' as const;
}

export function isInvalidPath(originalPath: string[], pathData: PathData) {
  return (
    pathData.value !== undefined &&
    typeof pathData.value !== 'object' &&
    pathData.path.length < originalPath.length
  );
}

export function pathExists<T extends object>(
  obj: T,
  path: string[],
  options: {
    value?: (value: unknown) => boolean;
    modifier?: (data: PathData) => undefined | unknown | void;
  } = {}
): PathData | undefined {
  if (!options.modifier) {
    options.modifier = (pathData) =>
      isInvalidPath(path, pathData) ? undefined : pathData.value;
  }

  const exists = traversePath(obj, path as FieldPath<T>, options.modifier);
  if (!exists) return undefined;

  if (options.value === undefined) return exists;
  return options.value(exists.value) ? exists : undefined;
}

export async function traversePathAsync<T extends object>(
  obj: T,
  realPath: FieldPath<T>,
  modifier?: (data: PathData) => MaybePromise<undefined | unknown | void>
): Promise<PathData | undefined> {
  if (!realPath.length) return undefined;
  const path: FieldPath<T> = [realPath[0]];

  let parent = obj;

  while (path.length < realPath.length) {
    const key = path[path.length - 1] as keyof typeof parent;

    const value = modifier
      ? await modifier({
          parent,
          key: String(key),
          value: parent[key],
          path: path.map((p) => String(p)),
          isLeaf: false,
          set: (v) => setPath(parent, key, v)
        })
      : parent[key];

    if (value === undefined) return undefined;
    else parent = value as T; // TODO: Handle non-object values

    path.push(realPath[path.length]);
  }

  const key = realPath[realPath.length - 1];

  return {
    parent,
    key: String(key),
    value: parent[key as keyof typeof parent],
    path: realPath.map((p) => String(p)),
    isLeaf: true,
    set: (v) => setPath(parent, key as keyof typeof parent, v)
  };
}

export function traversePath<T extends object>(
  obj: T,
  realPath: FieldPath<T>,
  modifier?: (data: PathData) => undefined | unknown | void
): PathData | undefined {
  if (!realPath.length) return undefined;
  const path: FieldPath<T> = [realPath[0]];

  let parent = obj;

  while (path.length < realPath.length) {
    const key = path[path.length - 1] as keyof typeof parent;

    const value = modifier
      ? modifier({
          parent,
          key: String(key),
          value: parent[key],
          path: path.map((p) => String(p)),
          isLeaf: false,
          set: (v) => setPath(parent, key, v)
        })
      : parent[key];

    if (value === undefined) return undefined;
    else parent = value as T; // TODO: Handle non-object values

    path.push(realPath[path.length]);
  }

  const key = realPath[realPath.length - 1];
  return {
    parent,
    key: String(key),
    value: parent[key as keyof typeof parent],
    path: realPath.map((p) => String(p)),
    isLeaf: true,
    set: (v) => setPath(parent, key as keyof typeof parent, v)
  };
}

type TraverseStatus = 'abort' | 'skip' | unknown | void;

export function traversePaths<T extends object, Path extends FieldPath<T>>(
  parent: T,
  modifier: (data: PathData) => TraverseStatus,
  path: Path | [] = []
): TraverseStatus {
  for (const key in parent) {
    const value = parent[key] as any;
    const isLeaf = value === null || typeof value !== 'object';

    const pathData: PathData = {
      parent,
      key,
      value,
      path: path.map(String).concat([key]),
      isLeaf,
      set: (v) => setPath(parent, key, v)
    };

    const status = modifier(pathData);

    if (status === 'abort') return status;
    else if (status === 'skip') continue;
    else if (!isLeaf) {
      const status = traversePaths(value, modifier, pathData.path as any);
      if (status === 'abort') return status;
    }
  }
}

export async function traversePathsAsync<
  T extends object,
  Path extends FieldPath<T>
>(
  parent: T,
  modifier: (data: PathData) => MaybePromise<TraverseStatus>,
  path: Path | [] = []
): Promise<TraverseStatus> {
  for (const key in parent) {
    const value = parent[key] as any;
    const isLeaf = value === null || typeof value !== 'object';

    const pathData: PathData = {
      parent,
      key,
      value,
      path: path.map(String).concat([key]),
      isLeaf,
      set: (v) => setPath(parent, key, v)
    };

    const status = await modifier(pathData);

    if (status === 'abort') return status;
    else if (status === 'skip') break;
    else if (!isLeaf) {
      const status = traversePaths(value, modifier, pathData.path as any);
      if (status === 'abort') return status;
    }
  }
}

/**
 * Compare two objects and return the differences as paths.
 */
export function comparePaths(newObj: unknown, oldObj: unknown) {
  const diffPaths = new Map<string, string[]>();

  function checkPath(data: PathData, compareTo: object) {
    if (data.isLeaf) {
      const exists = traversePath(compareTo, data.path as FieldPath<object>);

      if (!exists) {
        diffPaths.set(data.path.join(' '), data.path);
      } else if (
        data.value instanceof Date &&
        exists.value instanceof Date &&
        data.value.getTime() != exists.value.getTime()
      ) {
        diffPaths.set(data.path.join(' '), data.path);
      } else if (data.value !== exists.value) {
        diffPaths.set(data.path.join(' '), data.path);
      }
    }
  }

  traversePaths(newObj as object, (data) =>
    checkPath(data, oldObj as object)
  );

  traversePaths(oldObj as object, (data) =>
    checkPath(data, newObj as object)
  );

  return Array.from(diffPaths.values());
}

export function setPaths(
  obj: Record<string, unknown>,
  paths: string[][],
  value: unknown
) {
  for (const path of paths) {
    const leaf = traversePath(
      obj,
      path as FieldPath<typeof obj>,
      ({ parent, key, value }) => {
        if (value === undefined || typeof value !== 'object') {
          // If a previous check tainted the node, but the search goes deeper,
          // so it needs to be replaced with a (parent) node
          parent[key] = {};
        }
        return parent[key];
      }
    );
    if (leaf) leaf.parent[leaf.key] = value;
  }
}
