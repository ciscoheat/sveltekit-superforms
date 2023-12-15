import { superValidate } from '$lib/server';
import { expect, test, describe } from 'vitest';
import { z, type AnyZodObject } from 'zod';

type ModeTest = {
  name: string;
  schema: AnyZodObject;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  valid: boolean;
  errors: Record<string, unknown>;
};

describe('Strict mode', () => {
  test('Should be pure, even if strict mode is enabled', async () => {
    const input = { fooo: 'wrong-key', foo: 'correct-key' };
    const schema = z.object({
      foo: z.string()
    });

    const form = await superValidate(
      input as Record<string, unknown>,
      schema,
      {
        strict: true
      }
    );
    expect(input).toMatchObject({ fooo: 'wrong-key', foo: 'correct-key' });
    expect(form.data).toEqual({ foo: 'correct-key' });
    expect(form.errors).toEqual({});
    expect(form.valid).toEqual(true);
  });

  const tests = [
    {
      name: 'Should be invalid if foo is not present in object and strict=true',
      schema: z.object({
        foo: z.string()
      }),
      input: {},
      expected: {
        foo: ''
      },
      valid: false,
      errors: {
        foo: ['Required']
      }
    },
    {
      name: 'Should be valid if foo is not present but optional in object and strict=true',
      schema: z.object({
        foo: z.string().optional()
      }),
      input: {},
      expected: {},
      valid: true,
      errors: {}
    },
    {
      name: 'Should be invalid if key is mispelled strict=true',
      schema: z.object({
        foo: z.string()
      }),
      input: {
        fo: 'bar'
      },
      expected: {
        foo: ''
      },
      valid: false,
      errors: {
        foo: ['Required']
      }
    },
    {
      name: 'Should work with strict=true and number',
      schema: z.object({
        cost: z.number()
      }),
      input: {
        cost: 20
      },
      expected: {
        cost: 20
      },
      valid: true,
      errors: {}
    },
    {
      name: 'Should work with strict=true and a string with min length requirements',
      schema: z.object({
        foo: z.string().min(2)
      }),
      input: {
        foo: ''
      },
      expected: {
        foo: ''
      },
      valid: false,
      errors: {
        foo: ['String must contain at least 2 character(s)']
      }
    }
  ];

  testMode(tests, true);
});

function testMode(tests: ModeTest[], strict: boolean) {
  for (const { name, input, schema, valid, expected, errors } of tests) {
    test(name + ' (POJO)', async () => {
      const inputClone = structuredClone(input);
      const form = await superValidate(
        input as Record<string, unknown>,
        schema,
        {
          strict
        }
      );
      expect(input).toMatchObject(inputClone);
      expect(form.data).toEqual(expected);
      expect(form.errors).toEqual(errors);
      expect(form.valid).toEqual(valid);
    });
    test(name + ' (FormData)', async () => {
      const inputClone = structuredClone(input);
      const formData = new FormData();
      for (const [key, value] of Object.entries(input)) {
        formData.set(key, value ? `${value}` : '');
      }
      const form = await superValidate(formData, schema, {
        strict
      });
      expect(input).toMatchObject(inputClone);
      expect(form.data).toEqual(expected);
      expect(form.errors).toEqual(errors);
      expect(form.valid).toEqual(valid);
    });
    test(name + ' (UrlSearchParams)', async () => {
      const inputClone = structuredClone(input);
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(input)) {
        params.set(key, `${value}`);
      }
      const form = await superValidate(params, schema, {
        strict
      });
      expect(input).toMatchObject(inputClone);
      expect(form.data).toEqual(expected);
      expect(form.errors).toEqual(errors);
      expect(form.valid).toEqual(valid);
    });
  }
}
