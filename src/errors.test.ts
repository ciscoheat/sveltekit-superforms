import { setError, superValidate } from '$lib/server';
import { expect, test, describe, assert } from 'vitest';
import { z } from 'zod';
import { entityData } from '$lib/schemaEntity';
import { flattenErrors } from '$lib/errors';

describe('Errors', async () => {
  test('Adding errors with setError', async () => {
    const schema = z.object({
      scopeId: z.number().int().min(1),
      name: z.string().nullable(),
      object: z.object({ name: z.string() }).optional(),
      arr: z.string().array().optional(),
      enumber: z.enum(['test', 'testing']).optional()
    });

    const output = await superValidate({ scopeId: 3, name: null }, schema);

    expect(output.valid).equals(true);
    expect(output.errors).toStrictEqual({});
    expect(output.data.scopeId).toEqual(3);
    expect(output.data.name).toBeNull();

    const err = {
      _errors: ['Form-level error'],
      scopeId: ['This is an error'],
      enumber: ['This should be ok', 'Still ok'],
      arr: { _errors: ['Array-level error'], 3: ['Array item error'] },
      object: { name: ['Object error'] }
    };

    setError(output, 'scopeId', 'This should not be displayed.');
    setError(output, 'scopeId', 'This is an error', { overwrite: true });
    setError(output, 'object.name', 'Object error');
    setError(output, 'arr[3]', 'Array item error');
    setError(output, 'enumber', 'This should be ok');
    setError(output, 'enumber', 'Still ok');
    setError(output, 'arr._errors', 'Array-level error');
    setError(output, '', 'Form-level error that should not be displayed.');
    setError(output, '', 'Form-level error', { overwrite: true });

    assert(!output.valid);
    expect(output.errors).toStrictEqual(err);

    // Should fail, since name does not exist.
    const output2 = await superValidate({ scopeId: 3 }, schema);

    assert(!output2.valid);
    expect(output2.errors.name?.length).toEqual(1);
    expect(output2.data.scopeId).toEqual(3);
    expect(output2.data.name).toBeNull();
  });

  test('Clearing errors with noErrors', async () => {
    const schema = z.object({
      scopeId: z.number().int().min(1),
      name: z.string().nullable()
    });

    const output = await superValidate({ scopeId: 0, name: 'abc' }, schema);

    assert(!output.valid);
    expect(output.posted).toEqual(false);
    expect(output.errors.scopeId?.length).toEqual(1);
    expect(Object.keys(output.errors).length).toEqual(1);
    expect(output.data.scopeId).toEqual(0);
    expect(output.data.name).toEqual('abc');
  });

  test('AllErrors', async () => {
    const nestedSchema = z.object({
      id: z.number().positive(),
      users: z
        .object({
          name: z.string().min(2).regex(/X/),
          posts: z
            .object({ subject: z.string().min(1) })
            .array()
            .min(2)
            .optional()
        })
        .array()
    });

    const form = await superValidate(
      { users: [{ name: 'A', posts: [{ subject: '' }] }] },
      nestedSchema
    );

    expect(flattenErrors(form.errors)).toStrictEqual([
      { path: 'id', messages: ['Required'] },
      {
        path: 'users[0].name',
        messages: ['String must contain at least 2 character(s)', 'Invalid']
      },
      {
        path: 'users[0].posts[0].subject',
        messages: ['String must contain at least 1 character(s)']
      },
      {
        path: 'users[0].posts._errors',
        messages: ['Array must contain at least 2 element(s)']
      }
    ]);
  });

  test('Form-level errors', async () => {
    const refined = z
      .object({ name: z.string().min(1) })
      .refine(() => false, 'Form-level error');

    const form0 = await superValidate(null, refined);

    assert(form0.valid === false);
    expect(form0.errors).toStrictEqual({});

    const form = await superValidate({ name: 'Abc' }, refined);

    assert(form.valid === false);
    expect(form.errors).toStrictEqual({
      _errors: ['Form-level error']
    });

    expect(form.errors._errors).toStrictEqual(['Form-level error']);

    const form2 = await superValidate({ name: '' }, refined);

    assert(form2.valid === false);
    expect(form2.errors).toStrictEqual({
      _errors: ['Form-level error'],
      name: ['String must contain at least 1 character(s)']
    });

    expect(form2.errors).toStrictEqual({
      _errors: ['Form-level error'],
      name: ['String must contain at least 1 character(s)']
    });
  });

  test('Errors with errors === false', async () => {
    const refined = z
      .object({ name: z.string().min(1) })
      .refine(() => false, 'Form-level error');

    const form = await superValidate({ name: '' }, refined, {
      errors: false
    });

    assert(form.valid === false);
    expect(form.errors).toStrictEqual({});
  });

  test('Form-level errors only with refine', async () => {
    const schema = z
      .object({
        scoops: z.number().int().min(1).default(1),
        flavours: z.string().min(1).array().default(['Mint choc chip'])
      })
      .refine(
        (data) => data.flavours.length < data.scoops,
        "Can't order more flavours than scoops!"
      );

    const data = new FormData();
    data.set('scoops', '1');
    data.append('flavours', 'Mint choc chip');
    data.append('flavours', 'Raspberry ripple');

    const form = await superValidate(data, schema);

    expect(form).toStrictEqual({
      id: '1exthb3',
      valid: false,
      errors: { _errors: ["Can't order more flavours than scoops!"] },
      data: { scoops: 1, flavours: ['Mint choc chip', 'Raspberry ripple'] },
      posted: true,
      constraints: {
        scoops: { min: 1, required: true },
        flavours: { minlength: 1, required: true }
      }
    });
  });

  test('Array errors', async () => {
    const schema = z.object({
      name: z.string(),
      tags: z.string().min(1).array().min(2)
    });

    const form = await superValidate({ tags: [''] }, schema);

    assert(!form.valid);
    expect(form.errors).toStrictEqual({
      name: ['Required'],
      tags: {
        '0': ['String must contain at least 1 character(s)'],
        _errors: ['Array must contain at least 2 element(s)']
      }
    });

    const form2 = await superValidate({ tags: ['only one'] }, schema);

    assert(!form2.valid);
    expect(form2.errors).toStrictEqual({
      name: ['Required'],
      tags: { _errors: ['Array must contain at least 2 element(s)'] }
    });
  });
});

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
    flavours: { _errors: ["Can't order more flavours than scoops!"] }
  });
});
