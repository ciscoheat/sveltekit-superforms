/* eslint-disable @typescript-eslint/no-explicit-any */

type PathData = {
  parent: any;
  key: string;
  value: any;
};

export function checkPath(
  obj: any,
  path: string[],
  modifier?: (data: PathData) => undefined | unknown | void
): PathData | undefined {
  if (!path.length) return undefined;
  path = [...path];

  let parent = obj;

  while (path.length > 1) {
    const key = path.shift() || '';
    const value = modifier
      ? modifier({ parent, key, value: parent[key] })
      : parent[key];

    if (value === undefined) return undefined;
    else parent = value;
  }

  const key = path[0];
  return { parent, key, value: parent[key] };
}
