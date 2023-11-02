/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  StringPath,
  FormPathType,
  FormPathArrays,
  StringPathLeaves
} from '$lib/stringPath';
import { test } from 'vitest';
import type { z } from 'zod';

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
  names: string[];
};

const i = 7 + 3;

type Test = StringPath<Obj>;
type Arrays = FormPathArrays<Obj>;

test('StringPath', () => {
  const t1: Test = 'name';
  const t2: Test = 'city';
  const t3: Test = 'tags';
  const t4: Test = 'city.name';
  const t5: Test = 'tags[3]';
  const t6: Test = 'tags[3].name';
  const t7: Test = 'scores[3][4]';
  const t8: Test = 'names[3]';

  // @ts-expect-error incorrect path
  const t1e: Test = 'city[3]';
  // @ts-expect-error incorrect path
  const t2e: Test = 'city.nope';
  // @ts-expect-error incorrect path
  const t3e: Test = 'tags[4].nope';
  // @ts-expect-error incorrect path
  const t4e: Test = 'nope';
  // @ts-expect-error incorrect path
  const t5e: Test = 'names[2].test';

  const a1: Arrays = 'scores';
  const a2: Arrays = 'scores[3]';
  const a3: Arrays = 'tags';
  const a4: Arrays = 'tags[2].parents';
  const a5: Arrays = 'names';

  // @ts-expect-error incorrect path
  const a1e: Arrays = 'name';
  // @ts-expect-error incorrect path
  const a2e: Arrays = 'points';
  // @ts-expect-error incorrect path
  const a3e: Arrays = 'scores[2][1]';
  // @ts-expect-error incorrect path
  const a4e: Arrays = 'city';
  // @ts-expect-error incorrect path
  const a5e: Arrays = 'tags[1]';
  // @ts-expect-error incorrect path
  const a6e: Arrays = 'names[1]';
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

  type ExtraLeaves = StringPathLeaves<typeof o, '_errors'>;

  const a1: ExtraLeaves = 'test._errors';
  const a2: ExtraLeaves = 'obj.arr._errors';
  // @ts-expect-error incorrect path
  const a3: ExtraLeaves = 'obj.name._errors';
  // @ts-expect-error incorrect path
  const a4: ExtraLeaves = 'obj._errors';
  // @ts-expect-error incorrect path
  const a5: ExtraLeaves = 'obj.arr[2]._errors';
  const a6: ExtraLeaves = 'obj.arr[2]';
  const a7: ExtraLeaves = 'obj.next._errors';
  const a8: ExtraLeaves = 'obj.next[1].level';
  // @ts-expect-error incorrect path
  const a9: ExtraLeaves = 'obj.next[1]._errors';
});

test('Objects with sets', () => {
  type SetObj = {
    numbers: {
      set: Set<number>;
    };
  };

  type SetTest = StringPath<SetObj>;

  const a1: SetTest = 'numbers';
  const a2: SetTest = 'numbers.set';
  // @ts-expect-error incorrect path
  const a3: SetTest = 'numbers.set.size';

  type SetLeaves = StringPathLeaves<SetObj>;

  // @ts-expect-error incorrect path
  const b1: SetLeaves = 'numbers';
  const b2: SetLeaves = 'numbers.set';
  // @ts-expect-error incorrect path
  const b3: SetTest = 'numbers.set.size';
});
