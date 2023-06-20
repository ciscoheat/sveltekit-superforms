import type { MaybePromise, FieldPath } from './index.js';

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
    const exists = traversePath(compareTo, data.path as FieldPath<object>);

    function addDiff() {
      diffPaths.set(data.path.join(' '), data.path);
    }

    if (data.isLeaf) {
      if (!exists) {
        addDiff();
      } else if (
        data.value instanceof Date &&
        exists.value instanceof Date &&
        data.value.getTime() != exists.value.getTime()
      ) {
        addDiff();
      } else if (data.value !== exists.value) {
        addDiff();
      }
    } else if (
      exists &&
      data.value instanceof Set &&
      exists.value instanceof Set &&
      data.value !== exists.value
    ) {
      addDiff();
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
