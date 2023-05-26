import type { ValidationErrors, FieldPath } from './index.js';
import type {
  ZodTypeAny,
  AnyZodObject,
  ZodFormattedError,
  ZodEffects
} from 'zod';
import type { MaybePromise } from '$app/forms';

export type ZodTypeInfo = {
  zodType: ZodTypeAny;
  isNullable: boolean;
  isOptional: boolean;
  hasDefault: boolean;
  effects: ZodEffects<ZodTypeAny> | undefined;
  defaultValue: unknown;
};

export function mapErrors<T extends AnyZodObject>(
  obj: ZodFormattedError<unknown>,
  top = true
) {
  const output: Record<string, unknown> = {};
  const entries = Object.entries(obj);

  if (top && '_errors' in obj) {
    if (obj._errors.length) output._errors = obj._errors;
  } else if (
    entries.length === 1 &&
    entries[0][0] === '_errors' &&
    obj._errors.length
  ) {
    return obj._errors as unknown as ValidationErrors<T>;
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
): { path: string[]; messages: string[] }[] {
  const entries = Object.entries(errors);
  return entries
    .filter(([, value]) => value !== undefined)
    .flatMap(([key, messages]) => {
      if (Array.isArray(messages) && messages.length > 0) {
        const currPath = path.concat([key]);
        return { path: currPath, messages };
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
