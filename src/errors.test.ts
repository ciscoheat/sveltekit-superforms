import { superValidate } from '$lib/server';
import { expect, test, describe, assert } from 'vitest';
import { z } from 'zod';
import { entityData } from '$lib/schemaEntity';

describe('Schema errors with arrays and objects', () => {
  const schema = z.object({
    tags: z
      .object({
        id: z.number(),
        names: z.string().min(2).array(),
        test: z.union([z.string(), z.string().array()])
      })
      .array()
      .min(2)
  });

  test('Schema shape traversal', () => {
    expect(entityData(schema).errorShape).toStrictEqual({
      tags: { names: {}, test: {} }
    });
  });

  test('Array errors with nested errors', async () => {
    const form = await superValidate(
      { tags: [{ id: 123, names: ['a'], test: 'test' }] },
      schema
    );
    expect(form.errors.tags?._errors).toEqual([
      'Array must contain at least 2 element(s)'
    ]);
    expect(form.errors.tags?.[0].names?.[0]).toEqual([
      'String must contain at least 2 character(s)'
    ]);
  });

  test('Array errors without nested errors', async () => {
    const form = await superValidate(
      { tags: [{ id: 123, names: ['aa'], test: ['aaa'] }] },
      schema
    );
    expect(form.errors.tags?._errors).toEqual([
      'Array must contain at least 2 element(s)'
    ]);
    expect(form.errors.tags?.[0]).toBeUndefined();
  });
});

test('Refined errors on leaf node', async () => {
  const iceCream = z
    .object({
      scoops: z.number().int().min(1).default(1),
      flavours: z
        .string()
        .array()
        .min(1, 'Please select at least one flavour')
        .default(['Mint choc chip'])
    })
    .refine((data) => data.flavours.length <= data.scoops, {
      message: "Can't order more flavours than scoops!",
      path: ['flavours']
    });

  const form = await superValidate(
    { scoops: 1, flavours: ['Mint choc chip', 'Raspberry ripple'] },
    iceCream
  );

  assert(form.valid == false);
  expect(form.errors).toStrictEqual({
    flavours: ["Can't order more flavours than scoops!"]
  });
});
