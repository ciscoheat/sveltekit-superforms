export type FieldPath<T extends object> = NonNullable<T> extends (infer U)[]
  ? NonNullable<U> extends object
    ?
        | `[${number}]`
        | `[${number}]${U extends unknown[]
            ? ''
            : '.'}${NonNullable<U> extends Date
            ? never
            : FieldPath<NonNullable<U>> & string}`
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
                  : FieldPath<NonNullable<T[K]>> & string}`
              : never
            : never;
        }[keyof T]
  : never;

export type PathValue<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends number
  ? T
  : P extends `.${infer Rest}`
  ? PathValue<NonNullable<T>, Rest>
  : P extends `${number}]${infer Rest}`
  ? NonNullable<T> extends (infer U)[]
    ? PathValue<U, Rest>
    : { invalid_path: P; Type: T }
  : P extends `${infer K}[${infer Rest}`
  ? K extends keyof NonNullable<T>
    ? PathValue<NonNullable<T>[K], Rest>
    : PathValue<T, Rest>
  : P extends `${infer K}.${infer Rest}`
  ? K extends keyof NonNullable<T>
    ? PathValue<NonNullable<T>[K], Rest>
    : NonNullable<T> extends (infer U)[]
    ? PathValue<U, Rest>
    : { invalid_path: P; Type: T }
  : P extends `[${infer K}].${infer Rest}`
  ? K extends number
    ? T extends (infer U)[]
      ? PathValue<U, Rest>
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
  : T;

type Obj = {
  name: string;
  points: number;
  scores: Date[][];
  city: {
    name: string;
  };
  tags:
    | ({ id: number; name: string; parents: number[] } | null)[]
    | undefined;
};

let i = 7 + 3;

type Test = FieldPath<Obj>;

const a1: Test = 'name';
const a2: Test = 'city';
const a3: Test = 'tags';
const a4: Test = 'city.name';
const a5: Test = 'tags[3]';
const a6: Test = 'tags[3].name';
const a7: Test = 'scores[3][4]';

const n8: Test = 'city[3]';
const n7: Test = 'city.nope';
const n9: Test = 'tags[4].nope';
const n0: Test = 'nope';

function checkPath<T = never>() {
  return function <U extends string = string>(path: U): PathValue<T, U> {
    return path as PathValue<T, U>;
  };
}

const checkObj = checkPath<Obj>();

const a = checkObj(`tags[${i + 3}].name`); // string
const b = checkObj(`scores[${i + 3}][0]`); // Date

const t0: PathValue<Obj, 'name'> = 'string';
const t1: PathValue<Obj, 'points'> = 123;
const t2: PathValue<Obj, 'city'> = { name: 'London' };
const t3: PathValue<Obj, 'tags'> = [{ id: 123, name: 'Test', parents: [] }];
const t4: PathValue<Obj, 'tags[0]'> = {
  id: 123,
  name: 'Test',
  parents: [1]
};
const t5: PathValue<Obj, 'tags[0].name'> = 'string';
const t6: PathValue<Obj, `tags[5].id`> = 123;
type ShouldBeNever = PathValue<Obj, 'tags.1.nope'>;
