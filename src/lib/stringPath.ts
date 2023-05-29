import type { FieldPath } from './index.js';

export function splitPath<T extends object>(
  path: StringPath<T> | StringPathLeaves<T>
) {
  return path
    .toString()
    .split(/[[\].]+/)
    .filter((p) => p) as FieldPath<T>;
}

/**
 * Lists all paths in an object as string accessors.
 */
export type StringPath<T extends object> = NonNullable<T> extends (infer U)[]
  ? NonNullable<U> extends object
    ?
        | `[${number}]`
        | `[${number}]${U extends unknown[]
            ? ''
            : '.'}${NonNullable<U> extends Date
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
                  : '.'}${NonNullable<T[K]> extends Date
                  ? never
                  : StringPath<NonNullable<T[K]>> & string}`
              : never
            : never;
        }[keyof T]
  : never;

/**
 * Like StringPath, but only with non-objects as accessible properties.
 * Similar to the leaves in a node tree, if you look at the object as a tree structure.
 */
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
              ? NonNullable<T[K]> extends Date
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

export type StringPathType<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends number
  ? T
  : P extends `.${infer Rest}`
  ? StringPathType<NonNullable<T>, Rest>
  : P extends `${number}]${infer Rest}`
  ? NonNullable<T> extends (infer U)[]
    ? StringPathType<U, Rest>
    : { invalid_path: P; Type: T }
  : P extends `${infer K}[${infer Rest}`
  ? K extends keyof NonNullable<T>
    ? StringPathType<NonNullable<T>[K], Rest>
    : StringPathType<T, Rest>
  : P extends `${infer K}.${infer Rest}`
  ? K extends keyof NonNullable<T>
    ? StringPathType<NonNullable<T>[K], Rest>
    : NonNullable<T> extends (infer U)[]
    ? StringPathType<U, Rest>
    : { invalid_path: P; Type: T }
  : P extends `[${infer K}].${infer Rest}`
  ? K extends number
    ? T extends (infer U)[]
      ? StringPathType<U, Rest>
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
