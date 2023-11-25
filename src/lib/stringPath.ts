import type { FieldPath } from './index.js';

export function splitPath<T extends object>(path: string) {
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
  | FormPathLeaves<T>
  | FormPathArrays<T>;

/**
 * List paths in an object as string accessors, but only with non-objects as accessible properties.
 * Similar to the leaves in a node tree, if you look at the object as a tree structure.
 */
export type FormPathLeaves<T extends object> = string & StringPathLeaves<T>;

/**
 * List all arrays in an object as string accessors.
 */
export type FormPathArrays<T extends object> = string & StringPathArrays<T>;

export type StringPathArrays<T extends object, Path extends string = ''> = {
  [K in Extract<keyof T, string>]: NonNullable<T[K]> extends
    | Date
    | Set<unknown>
    ? never
    : NonNullable<T[K]> extends (infer U)[]
    ?
        | `${Path}${Path extends '' ? '' : '.'}${K}`
        | StringPathArrays<
            NonNullable<U>,
            `${Path}${Path extends '' ? '' : '.'}${K}[${number}]`
          >
    : NonNullable<T[K]> extends object
    ? StringPathArrays<
        NonNullable<T[K]>,
        `${Path}${Path extends '' ? '' : '.'}${K}`
      >
    : NonNullable<T> extends unknown[]
    ? Path
    : never;
}[Extract<keyof T, string>];

export type StringPath<
  T extends object,
  OnlyArrays extends boolean = false
> = NonNullable<T> extends (infer U)[]
  ? NonNullable<U> extends object
    ?
        | (OnlyArrays extends false
            ? `[${number}]`
            : NonNullable<U> extends unknown[]
            ? `[${number}]`
            : never)
        | `[${number}]${NonNullable<U> extends unknown[]
            ? ''
            : '.'}${NonNullable<U> extends Date | Set<unknown>
            ? never
            : StringPath<NonNullable<U>, OnlyArrays> & string}`
    : `[${number}]`
  : NonNullable<T> extends object
  ?
      | (OnlyArrays extends false
          ? keyof T
          : {
              [K in keyof T]-?: K extends string
                ? NonNullable<T[K]> extends unknown[]
                  ? K
                  : never
                : never;
            }[keyof T])
      | {
          [K in keyof T]-?: K extends string
            ? NonNullable<T[K]> extends object
              ? `${K}${NonNullable<T[K]> extends unknown[]
                  ? ''
                  : '.'}${NonNullable<T[K]> extends Date | Set<unknown>
                  ? never
                  : StringPath<NonNullable<T[K]>, OnlyArrays> & string}`
              : never
            : never;
        }[keyof T]
  : never;

export type StringPathLeaves<
  T extends object,
  Arr extends string = never
> = NonNullable<T> extends (infer U)[]
  ? NonNullable<U> extends object
    ?
        | (Arr extends never ? never : `.${Arr}`)
        | `[${number}]${NonNullable<U> extends unknown[]
            ? ''
            : '.'}${StringPathLeaves<NonNullable<U>, Arr> & string}`
    : `[${number}]` | (Arr extends never ? never : `.${Arr}`)
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
                  : '.'}${StringPathLeaves<NonNullable<T[K]>, Arr> & string}`
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
    : { invalid_path1: P; Type: T }
  : P extends `${infer K}[${infer Rest}`
  ? K extends keyof NonNullable<T>
    ? FormPathType<NonNullable<T>[K], Rest>
    : FormPathType<T, Rest>
  : P extends `${infer K}.${infer Rest}`
  ? K extends keyof NonNullable<T>
    ? FormPathType<NonNullable<T>[K], Rest>
    : NonNullable<T> extends (infer U)[]
    ? FormPathType<U, Rest>
    : { invalid_path2: P; Type: T }
  : P extends `[${infer K}].${infer Rest}`
  ? K extends number
    ? T extends (infer U)[]
      ? FormPathType<U, Rest>
      : { invalid_path3: P; Type: T }
    : P extends `${number}`
    ? NonNullable<T> extends (infer U)[]
      ? U
      : { invalid_path4: P; Type: T }
    : P extends keyof NonNullable<T>
    ? NonNullable<T>[P]
    : P extends `${number}`
    ? NonNullable<T> extends (infer U)[]
      ? U
      : { invalid_path5: P; Type: T }
    : { invalid_path6: P; Type: T }
  : P extends ''
  ? T
  : { invalid_path7: P; Type: T };
