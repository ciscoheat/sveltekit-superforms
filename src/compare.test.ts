/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  assert,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  test
} from 'vitest';
import {
  z,
  ZodArray,
  ZodString,
  type AnyZodObject,
  type ZodTypeAny
} from 'zod';
import { pathExists, traversePath, traversePathAsync } from '$lib/traversal';
import { get, writable } from 'svelte/store';
import { mapErrors } from '$lib/traversal';
import { hasEffects, unwrapZodType } from '$lib/server/entity';
import { superValidate } from '$lib/server';
import {
  booleanProxy,
  dateProxy,
  fieldProxy,
  intProxy,
  numberProxy
} from '$lib/client';
import type { FormPath, FieldPath } from '$lib';
import { comparePaths, setPaths } from '$lib/traversal';

const user = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2),
  email: z.string().email().nullable(),
  tags: z
    .object({ name: z.string().min(1) })
    .array()
    .optional()
});

export const social = z.object({
  user,
  friends: user.array()
});

const errors = social.safeParse({
  user: { id: 1, name: 'A' },
  friends: [
    { id: 123, name: 'OK', email: null },
    { id: 0, name: 'OK2' }
  ]
});

assert(!errors.success);

let mapped = mapErrors<typeof social>(errors.error.format());

beforeEach(() => {
  mapped = mapErrors<typeof social>(errors.error.format());
});

test('Mapping errors', () => {
  const check = {
    user: {
      name: ['String must contain at least 2 character(s)'],
      email: ['Required']
    },
    friends: {
      '1': {
        id: ['Number must be greater than 0'],
        email: ['Required']
      }
    }
  };

  expect(mapped).toStrictEqual(check);
});

describe('Path traversals', () => {
  test('Basic path traversal', () => {
    const path = ['friends', '1', 'id'];
    const error = traversePath(mapped, path as FieldPath<typeof mapped>);

    expect(error).toMatchObject({
      parent: mapped.friends![1],
      key: 'id',
      value: mapped.friends![1].id,
      path,
      isLeaf: true
    });
  });

  test('Basic path traversal, async', async () => {
    const path = ['friends', '1', 'id'];
    const error = await traversePathAsync(
      mapped,
      path as FieldPath<typeof mapped>
    );

    expect(error).toMatchObject({
      parent: mapped.friends![1],
      key: 'id',
      value: mapped.friends![1].id,
      path,
      isLeaf: true
    });
  });

  test('Basic path traversal, non-existing leaf', () => {
    const path = ['friends', '1', 'N/A'];
    const error = traversePath(mapped, path as FieldPath<typeof mapped>);

    expect(error).toMatchObject({
      parent: mapped.friends![1],
      key: 'N/A',
      value: undefined,
      isLeaf: true,
      path
    });
  });

  test('Basic path traversal, non-existing node', () => {
    const error = traversePath(mapped, ['friends', '2', 'id']);
    expect(error).toBeUndefined();
  });

  test('Basic path traversal, non-existing node with modifier', async () => {
    const path = ['friends', '2', 'id'];
    const error = await traversePathAsync(
      mapped,
      path as FieldPath<typeof mapped>,
      ({ parent, key, value }) => {
        if (value === undefined) parent[key] = {};
        return parent[key];
      }
    );
    expect(error).toMatchObject({
      parent: mapped.friends![2],
      key: 'id',
      value: undefined,
      isLeaf: true,
      path
    });
  });

  test('Setting a path', () => {
    const newErrors = ['A new error'];

    const Errors = writable(mapped);
    let loaded = false;

    Errors.subscribe((errors) => {
      if (!loaded) {
        loaded = true;
      } else {
        expect(errors.friends![2].id).toStrictEqual(newErrors);
      }
    });

    Errors.update((errors) => {
      const { parent, key } = traversePath(
        errors,
        ['friends', '2', 'id'],
        ({ parent, key, value }) => {
          if (value === undefined) parent[key] = {};
          return parent[key];
        }
      )!;
      parent[key] = newErrors;
      return errors;
    });
  });

  test('Traversing a Zod schema', async () => {
    const path = await traversePathAsync(
      social.shape,
      ['friends', 'tags', 'name'],
      ({ value }) => {
        let type = unwrapZodType(value).zodType;

        while (type.constructor.name === 'ZodArray') {
          type = (type as ZodArray<ZodTypeAny>)._def.type;
        }

        if (type.constructor.name == 'ZodObject') {
          return (type as AnyZodObject).shape;
        } else {
          return undefined;
        }
      }
    )!;

    assert(path && path.value instanceof ZodString);
    expect(path.value.safeParse('').success).toBeFalsy();
    expect(path.value.safeParse('ok').success).toBeTruthy();
  });

  test('fieldProxy traverse', async () => {
    const schema = z.object({
      id: z.number().int().positive(),
      name: z.string().min(2),
      email: z.string().email().nullable(),
      tags: z
        .object({ name: z.string().min(1) })
        .nullable()
        .array()
        .optional()
    });

    const person: z.infer<typeof schema> = {
      id: 123,
      name: 'Test',
      email: 'test@example.com',
      tags: [{ name: 'tag1' }, { name: 'tag2' }]
    };

    const form = await superValidate(person, schema);

    expectTypeOf(form.data).toMatchTypeOf(person);
    expectTypeOf(form.errors).toMatchTypeOf({});

    type U = z.infer<typeof schema>;

    const s0: FormPath<U, ['email']> = 'test@example.com';
    const s1: FormPath<U, ['id']> = 123;
    const s2: FormPath<U, ['tags']> = [{ name: 's2' }, null];

    const s3: FormPath<U, ['tags', 3]> = { name: 's3' };
    const s4: FormPath<U, ['tags', 3, 'name']> = 's4';

    expectTypeOf(s0).toMatchTypeOf('test@example.com');
    expectTypeOf(s1).toMatchTypeOf(123);
    expectTypeOf(s2).toMatchTypeOf([{ name: 's2' }, null]);
    expectTypeOf(s3).toMatchTypeOf({ name: 's3' });
    expectTypeOf(s4).toMatchTypeOf('s4');

    assert(form.valid);

    const store = writable(form.data);

    const proxy1 = fieldProxy(store, ['tags']);
    const proxy2 = fieldProxy(store, ['tags', 0]);
    const proxy3 = fieldProxy(store, ['tags', 1, 'name']);

    proxy3.set('tag2-proxy3');
    expect(get(store).tags?.[1]?.name).toEqual('tag2-proxy3');

    proxy2.set({ name: 'tag1-proxy2' });
    expect(get(store).tags?.[0]?.name).toEqual('tag1-proxy2');

    const tags = get(store).tags!;

    proxy1.set([tags[1], tags[0]]);

    expect(get(store)).toStrictEqual({
      id: 123,
      name: 'Test',
      email: 'test@example.com',
      tags: [{ name: 'tag2-proxy3' }, { name: 'tag1-proxy2' }]
    });

    const idProxy = fieldProxy(store, ['id']);

    idProxy.update((id) => id + 1);

    expect(get(store).id).toEqual(124);
  });
});

describe('Proxies', () => {
  test('booleanProxy', async () => {
    const schema = z.object({
      bool: z.boolean()
    });

    const superForm = await superValidate(schema);
    const form = writable(superForm.data);

    const proxy = booleanProxy(form, 'bool');

    expect(get(form).bool).toStrictEqual(false);

    proxy.set('true');

    expect(get(form).bool).toStrictEqual(true);
  });

  test('intProxy', async () => {
    const schema = z.object({
      int: z.number().int()
    });

    const superForm = await superValidate(schema);
    const form = writable(superForm.data);

    const proxy = intProxy(form, 'int');

    expect(get(form).int).toStrictEqual(0);

    proxy.set('123');

    expect(get(form).int).toStrictEqual(123);
  });

  test('numberProxy', async () => {
    const schema = z.object({
      number: z.number()
    });

    const superForm = await superValidate(schema);
    const form = writable(superForm.data);

    const proxy = numberProxy(form, 'number');

    expect(get(form).number).toStrictEqual(0);

    proxy.set('123.5');

    expect(get(form).number).toStrictEqual(123.5);
  });

  test('dateProxy', async () => {
    const schema = z.object({
      date: z.date()
    });

    const superForm = await superValidate(schema);
    const form = writable(superForm.data);

    const proxy = dateProxy(form, 'date');

    expect(get(form).date).toBeUndefined();

    const d = new Date();

    proxy.set(d.toISOString());

    expect(get(form).date).toEqual(d);
  });
});

describe('Path comparisons', () => {
  test('Basic path comparison', () => {
    const obj1 = {
      name: 'Obj1',
      tags: [{ name: 'tag1' }, { name: 'tag2' }],
      deep: {
        test: true
      }
    };

    const obj2 = {
      name: 'Obj2',
      tags: [{ name: 'tag1' }, { name: 'tag4' }]
    };

    //expect(comparePaths(obj1, obj1)).toStrictEqual([]);
    //expect(comparePaths(obj1, structuredClone(obj1))).toStrictEqual([]);

    expect(comparePaths(obj1, obj2)).toStrictEqual([
      ['name'],
      ['tags', '1', 'name'],
      ['deep', 'test']
    ]);
  });

  test('Paths with empty arrays', () => {
    const obj1 = {
      flavours: [],
      scoops: 1
    };

    const obj2 = {
      flavours: [],
      scoops: 1
    };

    expect(comparePaths(obj1, obj2)).toStrictEqual([]);
  });

  test('Paths with arrays', () => {
    const obj1 = {
      flavours: [],
      scoops: 1
    };

    const obj2 = {
      flavours: ['Mint choc chip'],
      scoops: 1
    };

    expect(comparePaths(obj1, obj2)).toStrictEqual([['flavours', '0']]);
  });

  test('Paths with different array values', () => {
    /* 
      Array comparisons can unfortunately break the illusion that the form
      fields themselves are tainted.
      If you click on a checkbox to add an item, the array comparison will
      taint more than one field.
    */

    const obj1 = {
      flavours: ['Mint choc chip'],
      scoops: 1
    };

    const obj2 = {
      flavours: ['Cookies and cream', 'Mint choc chip'],
      scoops: 1
    };

    expect(comparePaths(obj1, obj2)).toStrictEqual([
      ['flavours', '0'],
      ['flavours', '1']
    ]);
  });
});

test('Set paths', () => {
  const obj1 = {
    tags: {
      '3': true
    },
    deep: {
      test: true
    }
  };

  setPaths(obj1, [['name'], ['tags', '1']], true);

  expect(obj1).toStrictEqual({
    tags: { '1': true, '3': true },
    deep: { test: true },
    name: true
  });
});

test('Check path existence', () => {
  const errors = {
    tags: {
      '0': {
        id: true
      }
    }
  };

  expect(pathExists({}, ['tags', '0', 'id'])).toBeUndefined();

  expect(pathExists(errors, ['tags', '0', 'id'])).toMatchObject({
    parent: errors.tags[0],
    key: 'id',
    value: true,
    isLeaf: true,
    path: ['tags', '0', 'id']
  });
});

const refined = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2),
  email: z.string().email().nullable(),
  tags: z
    .object({ name: z.string().min(1) })
    .refine((data) => data.name.length > 5)
    .array()
    .optional()
});

test('Checking side effects', () => {
  expect(hasEffects(social)).toStrictEqual(false);
  expect(hasEffects(refined)).toStrictEqual(true);
});
