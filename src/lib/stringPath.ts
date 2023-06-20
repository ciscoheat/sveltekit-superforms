import type { FieldPath } from './index.js';

export function splitPath<T extends object>(
  path: StringPath<T> | StringPathLeaves<T>
) {
  return path
    .toString()
    .split(/[[\].]+/)
    .filter((p) => p) as FieldPath<T>;
}

export function mergePath(path: (string | number | symbol)[]) {
  return path.reduce((acc: string, next) => {
    if (typeof next === 'number' || !isNaN(parseInt(String(next), 10)))
      acc += `[${String(next)}]`;
    else if (!acc) acc += String(next);
    else acc += `.${String(next)}`;

    return acc;
  }, '');
}

/**
 * Lists all paths in an object as string accessors.
 */
export type FormPath<T extends object> =
  | (string & StringPath<T>)
  | FormPathLeaves<T>;

/**
 * Like FormPath, but only with non-objects as accessible properties.
 * Similar to the leaves in a node tree, if you look at the object as a tree structure.
 */
export type FormPathLeaves<T extends object> = string & StringPathLeaves<T>;

export type StringPath<T extends object> = NonNullable<T> extends (infer U)[]
  ? NonNullable<U> extends object
    ?
        | `[${number}]`
        | `[${number}]${U extends unknown[]
            ? ''
            : '.'}${NonNullable<U> extends Date | Set<unknown>
            ? never
            : StringPath<NonNullable<U>> & string}`
    : `[${number}]` | `[${number}].${U & string}`
  : NonNullable<T> extends object
  ?
      | keyof T
      | {
          [K in keyof T]-?: K extends string
            ? NonNullable<T[K]> extends object
              ? `${K}${NonNullable<T[K]> extends unknown[]
                  ? ''
                  : '.'}${NonNullable<T[K]> extends Date | Set<unknown>
                  ? never
                  : StringPath<NonNullable<T[K]>> & string}`
              : never
            : never;
        }[keyof T]
  : never;

export type StringPathLeaves<T extends object> =
  NonNullable<T> extends (infer U)[]
    ? NonNullable<U> extends object
      ? `[${number}]${NonNullable<U> extends unknown[]
          ? ''
          : '.'}${StringPathLeaves<NonNullable<U>> & string}`
      : `[${number}]`
    : NonNullable<T> extends object
    ?
        | {
            // Same as FilterObjects but inlined for better intellisense
            [K in keyof T]: NonNullable<T[K]> extends object
              ? NonNullable<T[K]> extends Date | Set<unknown>
                ? K
                : never
              : K;
          }[keyof T]
        | {
            [K in keyof T]-?: K extends string
              ? NonNullable<T[K]> extends object
                ? `${K}${NonNullable<T[K]> extends unknown[]
                    ? ''
                    : '.'}${StringPathLeaves<NonNullable<T[K]>> & string}`
                : never
              : never;
          }[keyof T]
    : never;

export type FormPathType<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends number
  ? T
  : P extends `.${infer Rest}`
  ? FormPathType<NonNullable<T>, Rest>
  : P extends `${number}]${infer Rest}`
  ? NonNullable<T> extends (infer U)[]
    ? FormPathType<U, Rest>
    : { invalid_path: P; Type: T }
  : P extends `${infer K}[${infer Rest}`
  ? K extends keyof NonNullable<T>
    ? FormPathType<NonNullable<T>[K], Rest>
    : FormPathType<T, Rest>
  : P extends `${infer K}.${infer Rest}`
  ? K extends keyof NonNullable<T>
    ? FormPathType<NonNullable<T>[K], Rest>
    : NonNullable<T> extends (infer U)[]
    ? FormPathType<U, Rest>
    : { invalid_path: P; Type: T }
  : P extends `[${infer K}].${infer Rest}`
  ? K extends number
    ? T extends (infer U)[]
      ? FormPathType<U, Rest>
      : { invalid_path: P; Type: T }
    : P extends `${number}`
    ? NonNullable<T> extends (infer U)[]
      ? U
      : { invalid_path: P; Type: T }
    : P extends keyof NonNullable<T>
    ? NonNullable<T>[P]
    : P extends `${number}`
    ? NonNullable<T> extends (infer U)[]
      ? U
      : { invalid_path: P; Type: T }
    : { invalid_path: P; Type: T }
  : P extends ''
  ? T
  : { invalid_path: P; Type: T };
