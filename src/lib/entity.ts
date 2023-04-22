import type { ValidationErrors, FieldPath } from './index.js';
import type { ZodTypeAny, AnyZodObject, ZodFormattedError } from 'zod';
import type { MaybePromise } from '$app/forms';

export type ZodTypeInfo = {
  zodType: ZodTypeAny;
  isNullable: boolean;
  isOptional: boolean;
  hasDefault: boolean;
  defaultValue: unknown;
};

export function mapErrors<T extends AnyZodObject>(
  obj: ZodFormattedError<unknown>,
  top = true
) {
  const output: Record<string, unknown> = {};
  const entries = Object.entries(obj);

  if (
    entries.length === 1 &&
    entries[0][0] === '_errors' &&
    obj._errors.length
  ) {
    return (top ? obj : obj._errors) as ValidationErrors<T>;
  } else if (obj._errors.length) {
    output._errors = obj._errors;
  }

  for (const [key, value] of entries.filter(([key]) => key !== '_errors')) {
    // _errors are filtered out, so casting is fine
    output[key] = mapErrors(
      value as unknown as ZodFormattedError<unknown>,
      false
    );
  }

  return output as ValidationErrors<T>;
}

export function findErrors(
  errors: ValidationErrors<AnyZodObject>,
  path: string[] = []
): { path: string[]; message: string }[] {
  const entries = Object.entries(errors);
  return entries.flatMap(([key, value]) => {
    if (Array.isArray(value) && value.length > 0) {
      const currPath = path.concat([key]);
      return value.map((message) => ({ path: currPath, message }));
    } else {
      return findErrors(
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
};

type FullPathData = PathData & {
  path: string[];
  isLeaf: boolean;
};

export async function traversePathAsync<T extends object>(
  obj: T,
  path: FieldPath<T>,
  modifier?: (data: PathData) => MaybePromise<undefined | unknown | void>
): Promise<PathData | undefined> {
  if (!path.length) return undefined;
  path = [...path];

  let parent = obj;

  while (path.length > 1) {
    const key = path[0];
    const value = modifier
      ? await modifier({
          parent,
          key: String(key),
          value: parent[key]
        })
      : parent[key];

    if (value === undefined) return undefined;
    else parent = value as T; // TODO: Handle non-object values

    path.shift();
  }

  const key = path[0];
  return {
    parent,
    key: String(key),
    value: parent[key]
  };
}

export function pathExists<T extends object>(
  obj: T,
  path: string[],
  value?: (value: unknown) => boolean
): PathData | undefined {
  const exists = traversePath(obj, path as FieldPath<T>);
  if (!exists) return undefined;

  if (value === undefined) return exists;
  return value(exists.value) ? exists : undefined;
}

export function traversePath<T extends object>(
  obj: T,
  path: FieldPath<T>,
  modifier?: (data: PathData) => undefined | unknown | void
): PathData | undefined {
  if (!path.length) return undefined;
  path = [...path];

  let parent = obj;

  while (path.length > 1) {
    const key = path[0];
    const value = modifier
      ? modifier({
          parent,
          key: String(key),
          value: parent[key]
        })
      : parent[key];

    if (value === undefined) return undefined;
    else parent = value as T; // TODO: Handle non-object values

    path.shift();
  }

  const key = path[0];
  return {
    parent,
    key: String(key),
    value: parent[key]
  };
}

type TraverseStatus = 'abort' | 'skip' | unknown | void;

export function traversePaths<T extends object, Path extends FieldPath<T>>(
  parent: T,
  modifier: (data: FullPathData) => TraverseStatus,
  path: Path | [] = []
): TraverseStatus {
  for (const key in parent) {
    const value = parent[key] as any;
    const isLeaf = value === null || typeof value !== 'object';

    const pathData: FullPathData = {
      parent,
      key,
      value,
      path: path.map(String).concat([key]),
      isLeaf
    };

    const status = modifier(pathData);

    if (status === 'abort') return status;
    else if (status === 'skip') break;
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
  modifier: (data: FullPathData) => MaybePromise<TraverseStatus>,
  path: Path | [] = []
): Promise<TraverseStatus> {
  for (const key in parent) {
    const value = parent[key] as any;
    const isLeaf = value === null || typeof value !== 'object';

    const pathData: FullPathData = {
      parent,
      key,
      value,
      path: path.map(String).concat([key]),
      isLeaf
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

  function checkPath(data: FullPathData, compareTo: object) {
    if (data.isLeaf) {
      const exists = traversePath(compareTo, data.path as FieldPath<object>);

      /*
      console.log('----------- Compare ------------ ');
      console.log(data);
      console.log('with');
      console.log(exists);
      */

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
