/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { assert, beforeEach, expect, test } from 'vitest';
import {
  z,
  ZodArray,
  ZodString,
  type AnyZodObject,
  type ZodTypeAny
} from 'zod';
import { traversePath, traversePathAsync } from '$lib/entity';
import { get, writable } from 'svelte/store';
import { mapErrors } from '$lib/entity';
import { unwrapZodType } from '$lib/server/entity';
import { superValidate } from '$lib/server';
import { fieldProxy } from '$lib/client/proxies';
import type { FormPath, FieldPath } from '$lib';

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
  expect(mapped).toStrictEqual({
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
  });
});

test('Basic path traversal', () => {
  const error = traversePath(mapped, ['friends', '1', 'id']);

  expect(error).toStrictEqual({
    parent: mapped.friends![1],
    key: 'id',
    value: mapped.friends![1].id
  });
});

test('Basic path traversal, async', async () => {
  const error = await traversePathAsync(mapped, ['friends', '1', 'id']);

  expect(error).toStrictEqual({
    parent: mapped.friends![1],
    key: 'id',
    value: mapped.friends![1].id
  });
});

test('Basic path traversal, non-existing leaf', () => {
  const error = traversePath(mapped, ['friends', '1', 'N/A']);

  expect(error).toStrictEqual({
    parent: mapped.friends![1],
    key: 'N/A',
    value: undefined
  });
});

test('Basic path traversal, non-existing node', () => {
  const error = traversePath(mapped, ['friends', '2', 'id']);
  expect(error).toBeUndefined();
});

test('Basic path traversal, non-existing node with modifier', async () => {
  const error = await traversePathAsync(
    mapped,
    ['friends', '2', 'id'],
    ({ parent, key, value }) => {
      if (value === undefined) parent[key] = {};
      return parent[key];
    }
  );
  expect(error).toStrictEqual({
    parent: mapped.friends![2],
    key: 'id',
    value: undefined
  });
});

test('Setting a path', () => {
  const path = ['friends', '2', 'id'];
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
      path,
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

test('proxyField traverse', async () => {
  const person: z.infer<typeof user> = {
    id: 123,
    name: 'Test',
    email: 'test@example.com',
    tags: [{ name: 'tag1' }, { name: 'tag2' }]
  };

  const form = await superValidate(person, user);

  type U = z.infer<typeof user>;

  type S1 = FormPath<U, ['tags']>;
  type S2 = FormPath<U, ['tags', 3]>;
  type S3 = FormPath<U, ['tags', 3, 'name']>;

  assert(form.valid);

  const store = writable(form.data);

  const proxy1 = fieldProxy(store, ['tags']);
  const proxy2 = fieldProxy(store, ['tags', 0]);
  const proxy3 = fieldProxy(store, ['tags', 1, 'name']);

  proxy3.set('tag2-proxy3');
  expect(get(store).tags?.[1].name).toEqual('tag2-proxy3');

  proxy2.set({ name: 'tag1-proxy2' });
  expect(get(store).tags?.[0].name).toEqual('tag1-proxy2');

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
