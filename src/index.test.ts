import { setError, superValidate, defaultData } from '$lib/server';
import { assert, expect, test, describe } from 'vitest';
import { z, type AnyZodObject } from 'zod';
import _slugify from 'slugify';
import { _dataTypeForm } from './routes/test/+page.server';
import { SuperFormError } from '$lib';
import { findErrors } from '$lib/entity';

const slugify = (
  str: string,
  options?: Exclude<Parameters<typeof _slugify>[1], string>
) => {
  return _slugify(str, { ...options, lower: true, strict: true });
};

const testDate = new Date();

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);

const AccountSchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.coerce.date().default(testDate),
  name: z.string().min(2).nullable(),
  phone: z
    .string()
    .regex(/^\+?\d{10,}$/)
    .nullable()
});

const userForm = AccountSchema.pick({
  id: true,
  name: true,
  createdAt: true
}).extend({
  slug,
  isBool: z.boolean(),
  nullable: z.string().nullable(),
  def: z.number().default(999),
  email: z.string().email()
});

const user = {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com'
};

const model = {
  id: user.id,
  name: user.name,
  email: user.email,
  slug: slugify(user.name ?? ''),
  createdAt: new Date(),
  isBool: true,
  nullable: null,
  def: 234
};

const validationErrors = {
  name: ['String must contain at least 2 character(s)']
};

test('Model validation', async () => {
  const validation = await superValidate(model, userForm);
  const data = validation.data;

  expect(validation.valid).toEqual(true);
  expect(validation.errors).toStrictEqual({});
  expect(data).toStrictEqual(model);
});

test('Failed model validation', async () => {
  const testData = { ...model, name: 'A' };
  const validation = await superValidate(testData, userForm);
  const data = validation.data;

  assert(!validation.valid, 'Validation should fail');
  expect(validation.errors).toStrictEqual(validationErrors);
  expect(data).toStrictEqual(testData);
});

test('FormData validation', async () => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(model)) {
    formData.set(key, value ? `${value}` : '');
  }

  // Remove the default
  formData.delete('def');

  const validation = await superValidate(formData, userForm);
  const data = validation.data;

  assert(validation.valid);
  expect(validation.errors).toStrictEqual({});

  // Date is transformed to string, so it cannot be compared directly.
  expect(data).toStrictEqual({
    ...model,
    ...{
      createdAt: new Date(formData.get('createdAt')?.toString() ?? ''),
      nullable: null,
      def: 999
    }
  });
});

test('Failed FormData validation', async () => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(model)) {
    formData.set(key, value ? `${value}` : '');
  }
  formData.set('name', 'A');

  const validation = await superValidate(formData, userForm);
  const data = validation.data;

  assert(!validation.valid, 'FormData validation should fail');

  expect(validation.errors).toStrictEqual(validationErrors);

  // Date is transformed to string, so it cannot be compared directly.
  expect(data).toStrictEqual({
    ...model,
    ...{
      name: 'A',
      createdAt: new Date(formData.get('createdAt')?.toString() ?? ''),
      nullable: null
    }
  });
});

test('FormData with nullable', async () => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(model)) {
    formData.set(key, value ? `${value}` : '');
  }
  formData.set('name', '');

  const validation = await superValidate(formData, userForm);

  expect(validation.data.name).toBeNull();
});

test('FormData array data', async () => {
  const formData = new FormData();

  formData.append('name', 'Nr1');
  formData.append('name', 'Nr2');

  const form = await superValidate(
    formData,
    z.object({ name: z.string().array() })
  );

  expect(form.data.name).toEqual(['Nr1', 'Nr2']);
});

test('Nullable values', async () => {
  const schema = z.object({
    scopeId: z.number().int().min(1),
    name: z.string().nullable()
  });

  const output = defaultData(schema);
  expect(output.scopeId).equals(0);
  expect(output.name).equals(null);

  const extended = schema
    .extend({
      scopeId: schema.shape.scopeId.default(7)
    })
    .transform((data) => ({ ...data, name: `Test${data.scopeId}` }));

  const output4 = await superValidate(null, extended);
  assert(output4.valid);
  expect(output4.data.scopeId).toEqual(7);
  expect(output4.data.name).toEqual('Test7');

  // If null is passed in and all fields have defaults, return them
  const output2 = defaultData(
    schema.extend({ scopeId: schema.shape.scopeId.default(10) })
  );
  expect(output2.scopeId).toEqual(10);
  expect(output2.name).toBeNull();
});

test('Optional values', async () => {
  const schema = z.object({
    other: z.string(),
    name: z.string().optional()
  });

  const output = await superValidate({ other: 'Test' }, schema);
  expect(output.valid).equals(true);
  expect(output.message).toBeUndefined();
  expect(output.data.name).toBeUndefined();
  expect(output.data.other).equals('Test');
  expect(output.errors).toStrictEqual({});

  const output2 = await superValidate(
    { name: 'Name', other: 'Test' },
    schema
  );
  expect(output2.valid).equals(true);
  expect(output2.data.name).equals('Name');
  expect(output2.data.other).equals('Test');
  expect(output.errors).toStrictEqual({});
});

test('Default values', async () => {
  const d = new Date();

  // Note that no default values for strings are needed,
  // they will be set to '' automatically.
  const e1 = await superValidate(
    null,
    userForm.extend({
      id: userForm.shape.id.default(undefined as unknown as number),
      isBool: userForm.shape.isBool.default(true),
      createdAt: userForm.shape.createdAt.removeDefault().default(d)
    })
  );

  expect(e1.data).toStrictEqual({
    id: undefined,
    name: null,
    email: '',
    createdAt: d,
    slug: '',
    isBool: true,
    nullable: null,
    def: 999
  });
});

test('More default values', async () => {
  const d = new Date();
  const e = await superValidate(
    null,
    _dataTypeForm.extend({
      date: _dataTypeForm.shape.date.removeDefault().default(d),
      coercedDate: _dataTypeForm.shape.coercedDate.default(d)
    })
  );

  expect(e.data).toStrictEqual({
    agree: true,
    string: 'Shigeru',
    email: '',
    nativeEnumInt: 0,
    nativeEnumString: 'GREEN',
    nativeEnumString2: 'Banana',
    bool: false,
    number: 0,
    proxyNumber: 0,
    nullableString: null,
    nullishString: null,
    optionalString: undefined,
    numberArray: [],
    proxyString: '',
    trimmedString: '',
    date: d,
    coercedNumber: 0,
    coercedDate: d
  });

  const form = await superValidate(null, _dataTypeForm);

  expect(form.valid).toEqual(false);
  expect(form.errors).toEqual({});
  expect(form.empty).toEqual(true);
  expect(form.message).toBeUndefined();

  expect(form.constraints).toStrictEqual({
    agree: { required: true },
    string: { required: true, minlength: 2 },
    email: { required: true },
    nativeEnumInt: { required: true },
    nativeEnumString: { required: true },
    nativeEnumString2: { required: true },
    bool: { required: true },
    number: { required: true },
    proxyNumber: { required: true, min: 10 },
    proxyString: { required: true },
    trimmedString: { required: true },
    numberArray: {
      /*_constraints: { min: 3, required: true },*/ required: true
    }
  });
});

enum Fruits {
  Apple,
  Banana
}

enum FruitsString {
  Apple = 'Apple',
  Banana = 'Banana'
}

const enumschema = z.object({
  gender: z.enum(['male', 'female', 'other']).nullish(),
  fruit: z.nativeEnum(Fruits).array(),
  fruitsstring: z.nativeEnum(FruitsString).array(),
  color: z.nativeEnum({ GRAY: 'GRAY', GREEN: 'GREEN' }).default('GREEN')
});

test('Zod enums and native enums', async () => {
  const form = await superValidate(null, enumschema, { includeMeta: true });
  expect(form.valid).toEqual(false);
  expect(form.empty).toEqual(true);

  expect(form).toStrictEqual({
    valid: false,
    errors: {},
    data: {
      color: 'GREEN',
      fruit: [],
      fruitsstring: [],
      gender: null
    },
    empty: true,
    constraints: {
      color: { required: true },
      fruit: { /*_constraints: { required: true },*/ required: true },
      fruitsstring: { /*_constraints: { required: true },*/ required: true }
    },
    meta: {
      types: {
        color: 'ZodNativeEnum',
        fruit: 'ZodArray<ZodNativeEnum>',
        fruitsstring: 'ZodArray<ZodNativeEnum>',
        gender: 'ZodEnum'
      }
    }
  });
});

test('Posting Zod enums and native enums', async () => {
  const data = new FormData();
  data.set('fruit', '1');
  data.append('fruit', 'Banana');
  data.append('fruit', 'Apple');
  data.append('fruit', '0');
  data.set('fruitsstring', 'Apple');
  data.append('fruitsstring', 'Banana');
  data.set('color', 'GRAY');

  const form = await superValidate(data, enumschema);

  expect(form).toStrictEqual({
    empty: false,
    valid: true,
    errors: {},
    data: {
      color: 'GRAY',
      fruit: [Fruits.Banana, Fruits.Banana, Fruits.Apple, Fruits.Apple],
      fruitsstring: [FruitsString.Apple, FruitsString.Banana],
      gender: null
    },
    constraints: {
      color: { required: true },
      fruit: { /*_constraints: { required: true },*/ required: true },
      fruitsstring: { /*_constraints: { required: true },*/ required: true }
    }
  });
});

test('Agressive type coercion to avoid schema duplication', async () => {
  const form = await superValidate(
    null,
    z.object({
      agree: z.literal(true).default(false as true),
      fruit: z.nativeEnum(Fruits).default(undefined as unknown as Fruits),
      number: z.number().positive().default(NaN)
    })
  );

  expect(form).toStrictEqual({
    valid: false,
    errors: {},
    data: { agree: false, fruit: undefined, number: NaN },
    empty: true,
    constraints: {
      agree: { required: true },
      fruit: { required: true },
      number: { min: 0, required: true }
    }
  });
});

test('Passing an array schema instead of an object', async () => {
  const schema = z
    .object({
      name: z.string()
    })
    .array();

  await expect(
    superValidate(null, z.string() as unknown as AnyZodObject)
  ).rejects.toThrowError(SuperFormError);

  await expect(
    superValidate(null, schema as unknown as AnyZodObject)
  ).rejects.toThrowError(SuperFormError);
});

test('Deeply nested objects', async () => {
  const schema = z.object({
    id: z.number().positive(),
    user: z.object({
      name: z.string().min(2),
      posts: z.object({ subject: z.string().min(1) }).array()
    })
  });

  const data = new FormData();
  data.set('id', '123');

  const form = await superValidate(data, schema);

  expect(form.valid).toBeFalsy();
  expect(form.empty).toBeFalsy();

  expect(form.errors).toStrictEqual({
    user: { name: ['String must contain at least 2 character(s)'] }
  });
  expect(form.data).toStrictEqual({
    id: 123,
    user: {
      name: '',
      posts: []
    }
  });
});

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

test('Deeply nested errors', async () => {
  const form = await superValidate(
    { users: [{ name: 'A', posts: [{ subject: '' }] }] },
    nestedSchema
  );

  expect(form.errors).toStrictEqual({
    id: ['Required'],
    users: {
      '0': {
        name: ['String must contain at least 2 character(s)', 'Invalid'],
        posts: {
          '0': { subject: ['String must contain at least 1 character(s)'] },
          _errors: ['Array must contain at least 2 element(s)']
        }
      }
    }
  });
});

test('Deeply nested constraints', async () => {
  const form = await superValidate(null, nestedSchema);

  expect(form.constraints).toStrictEqual({
    id: { min: 0, required: true },
    users: {
      name: { required: true, minlength: 2, pattern: 'X' },
      posts: {
        subject: { required: true, minlength: 1 }
      }
    }
  });
});

test('Refined schemas', async () => {
  const form = await superValidate(
    { id: 123, users: [{ name: 'Xenon' }] },
    nestedSchema.superRefine((check, ctx) => {
      if (check.id > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Too high ID',
          path: ['id']
        });
      }
    })
  );

  assert(!form.valid);
  expect(form.errors).toStrictEqual({ id: ['Too high ID'] });
});

test('Deeply nested objects', async () => {
  const schema = z.object({
    id: z.number().positive(),
    user: z.object({
      name: z.string().min(2),
      posts: z.object({ subject: z.string().min(1) }).array()
    })
  });

  const data = new FormData();
  data.set('id', '123');

  const form = await superValidate(data, schema);

  expect(form.valid).toStrictEqual(false);
  expect(form.empty).toStrictEqual(false);

  expect(form.errors).toStrictEqual({
    user: { name: ['String must contain at least 2 character(s)'] }
  });

  expect(form.data).toStrictEqual({
    id: 123,
    user: {
      name: '',
      posts: []
    }
  });
});

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
      scopeId: ['This is an error'],
      enumber: ['This should be ok', 'Still ok'],
      arr: { 3: ['Array error'] },
      object: { name: ['Object error'] }
    };

    setError(output, 'scopeId', 'This should not be displayed.');
    setError(output, 'scopeId', 'This is an error', { overwrite: true });
    setError(output, ['object', 'name'], 'Object error');
    setError(output, ['arr', 3], 'Array error');
    setError(output, 'enumber', 'This should be ok');
    setError(output, 'enumber', 'Still ok');

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
    expect(output.empty).toEqual(false);
    expect(output.errors.scopeId?.length).toEqual(1);
    expect(Object.keys(output.errors).length).toEqual(1);
    expect(output.data.scopeId).toEqual(0);
    expect(output.data.name).toEqual('abc');
  });

  test('AllErrors', async () => {
    const form = await superValidate(
      { users: [{ name: 'A', posts: [{ subject: '' }] }] },
      nestedSchema
    );

    expect(findErrors(form.errors)).toStrictEqual([
      { path: ['id'], message: 'Required' },
      {
        path: ['users', '0', 'name'],
        message: 'String must contain at least 2 character(s)'
      },
      { path: ['users', '0', 'name'], message: 'Invalid' },
      {
        path: ['users', '0', 'posts', '0', 'subject'],
        message: 'String must contain at least 1 character(s)'
      },
      {
        path: ['users', '0', 'posts', '_errors'],
        message: 'Array must contain at least 2 element(s)'
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

    setError(form, [], 'Form-level problem');
    setError(form, null, 'Another form-level problem');

    expect(form.errors._errors).toStrictEqual([
      'Form-level error',
      'Form-level problem',
      'Another form-level problem'
    ]);

    const form2 = await superValidate({ name: '' }, refined);

    assert(form2.valid === false);
    expect(form2.errors).toStrictEqual({
      _errors: ['Form-level error'],
      name: ['String must contain at least 1 character(s)']
    });

    setError(form2, [], 'Form-level problem');

    expect(form2.errors).toStrictEqual({
      _errors: ['Form-level error', 'Form-level problem'],
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
      valid: false,
      errors: { _errors: ["Can't order more flavours than scoops!"] },
      data: { scoops: 1, flavours: ['Mint choc chip', 'Raspberry ripple'] },
      empty: false,
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
      tags: ['Array must contain at least 2 element(s)']
    });
  });
});

test('URL and URLSearchParams validation', async () => {
  const urlSchema = z.object({
    id: z.number().int().positive(),
    createdAt: z.coerce.date().default(testDate),
    name: z.string().min(2).nullable(),
    tags: z.string().regex(/^\w+$/).array()
  });

  const url = new URL(
    'https://example.com/test?id=123&createdAt=2023-04-06&name=A%20test&tags=A&tags=B&tags=C'
  );

  const form = await superValidate(url, urlSchema);

  const expected = {
    valid: true,
    errors: {},
    data: {
      id: 123,
      name: 'A test',
      tags: ['A', 'B', 'C']
    },
    empty: false,
    constraints: {
      id: { min: 0, required: true },
      createdAt: { required: true },
      name: { minlength: 2 },
      tags: { pattern: '^\\w+$', required: true }
    }
  };

  expect(form.data.createdAt.getTime()).toEqual(
    new Date('2023-04-06').getTime()
  );

  expect(form).toMatchObject(expected);

  const form2 = await superValidate(url.searchParams, urlSchema);

  expect(form2.data.createdAt.getTime()).toEqual(
    new Date('2023-04-06').getTime()
  );

  expect(form2).toMatchObject(expected);
});

test('Call without data', async () => {
  const schema = z.object({
    name: z.string(),
    id: z.number()
  });

  const form = await superValidate(schema, { id: 'test' });

  expect(form).toStrictEqual({
    id: 'test',
    valid: false,
    errors: {},
    data: { name: '', id: 0 },
    empty: true,
    constraints: { name: { required: true }, id: { required: true } }
  });

  const form2 = await superValidate(
    schema.refine(() => false, 'Some error'),
    { id: 'test2' }
  );

  expect(form2).toStrictEqual({
    id: 'test2',
    valid: false,
    errors: {},
    data: { name: '', id: 0 },
    empty: true,
    constraints: { name: { required: true }, id: { required: true } }
  });
});

test('ZodObject defaults', async () => {
  const imageCreationFormSchema = z.object({
    textresource: z.string().trim(),
    promptExtra: z.string().trim().optional(),
    promptMetaData: z.object({
      textServiceId: z.enum(['a', 'b']).nullable().optional(),
      imageServiceId: z.enum(['c', 'd']).nullable().optional()
    }),
    provider: z.string().optional(),
    numbers: z.record(z.number())
  });

  const form = await superValidate(imageCreationFormSchema);

  expect(form).toStrictEqual({
    valid: false,
    errors: {},
    data: {
      textresource: '',
      promptExtra: undefined,
      promptMetaData: { textServiceId: null, imageServiceId: null },
      provider: undefined,
      numbers: {}
    },
    empty: true,
    constraints: {
      textresource: { required: true },
      promptMetaData: {},
      numbers: { required: true }
    }
  });
});
