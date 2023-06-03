/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  StringPath,
  FormPathType,
  StringPathLeaves
} from '$lib/stringPath';
import { test } from 'vitest';

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

const i = 7 + 3;

type Test = StringPath<Obj>;

test('StringPath', () => {
  const a1: Test = 'name';
  const a2: Test = 'city';
  const a3: Test = 'tags';
  const a4: Test = 'city.name';
  const a5: Test = 'tags[3]';
  const a6: Test = 'tags[3].name';
  const a7: Test = 'scores[3][4]';

  // @ts-expect-error incorrect path
  const n8: Test = 'city[3]';
  // @ts-expect-error incorrect path
  const n7: Test = 'city.nope';
  // @ts-expect-error incorrect path
  const n9: Test = 'tags[4].nope';
  // @ts-expect-error incorrect path
  const n0: Test = 'nope';
});

function checkPath<T = never>() {
  return function <U extends string = string>(path: U): FormPathType<T, U> {
    return path as FormPathType<T, U>;
  };
}

const checkObj = checkPath<Obj>();

test('StringPathType', () => {
  const a = checkObj(`tags[${i + 3}].name`); // string
  const b = checkObj(`scores[${i + 3}][0]`); // Date

  const t0: FormPathType<Obj, 'name'> = 'string';
  const t1: FormPathType<Obj, 'points'> = 123;
  const t2: FormPathType<Obj, 'city'> = { name: 'London' };
  const t3: FormPathType<Obj, 'tags'> = [
    { id: 123, name: 'Test', parents: [] }
  ];
  const t4: FormPathType<Obj, 'tags[0]'> = {
    id: 123,
    name: 'Test',
    parents: [1]
  };
  const t5: FormPathType<Obj, 'tags[0].name'> = 'string';
  const t6: FormPathType<Obj, `tags[5].id`> = 123;

  // @ts-expect-error incorrect path
  const n1: FormPathType<Obj, 'city[2]'> = 'never';
  // @ts-expect-error incorrect path
  const n2: FormPathType<Obj, 'nope incorrect'> = 'never';
});

test('StringPathLeaves', () => {
  const o = {
    test: [1, 2, 3],
    test2: [
      [{ date: new Date() }],
      [{ date: new Date() }, { date: new Date() }]
    ],
    name: 'name',
    other: [{ test: 'a', ok: 123 }, { test: 'b' }],
    obj: {
      ok: new Date('2023-05-29'),
      arr: [1, 2, 3],
      test: '1231231',
      next: [{ level: 1 }, { level: 2 }]
    }
  };

  // obj.ok should exist even though it's an object (Date)
  const p: StringPathLeaves<typeof o> = 'test[3]';
});
