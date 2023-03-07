import {
  noErrors,
  setError,
  superValidate,
  defaultEntity
} from '$lib/server';
import { assert, expect, test } from 'vitest';
import { z } from 'zod';
import _slugify from 'slugify';
import { _dataTypeForm } from './routes/test/+page.server';

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

  const output = defaultEntity(schema);
  expect(output.scopeId).equals(0);
  expect(output.name).equals(null);

  const output4 = await superValidate(null, schema, {
    defaults: {
      scopeId: 7,
      name: (n, data) => `Test${data.scopeId}${n}`
    }
  });
  assert(!output4.valid);
  expect(output4.data.scopeId).toEqual(7);
  expect(output4.data.name).toEqual('Test7null');

  // If null is passed in and all fields have defaults, return them
  const output2 = defaultEntity(
    schema.extend({ scopeId: schema.shape.scopeId.default(10) })
  );
  expect(output2.scopeId).toEqual(10);
  expect(output2.name).toBeNull();

  // If not null and a key is missing, it should fail since
  // name is nullable but not optional.
  const output3 = await superValidate({ scopeId: 3 }, schema, {
    defaults: {
      scopeId: 2,
      name: (n, data) => `Test${data.scopeId}${n}`
    }
  });
  assert(output3.valid);
  expect(output3.data.scopeId).toEqual(3);
  expect(output3.data.name).toEqual('Test3undefined');
  expect(output3.errors).toStrictEqual({});
});

test('Optional values', async () => {
  const schema = z.object({
    other: z.string(),
    name: z.string().optional()
  });

  const output = await superValidate({ other: 'Test' }, schema);
  expect(output.valid).equals(true);
  expect(output.message).equals(null);
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

test('Adding errors with setError', async () => {
  const schema = z.object({
    scopeId: z.number().int().min(1),
    name: z.string().nullable()
  });

  const output = await superValidate({ scopeId: 3, name: null }, schema);

  expect(output.valid).equals(true);
  expect(output.errors).toStrictEqual({});
  expect(output.data.scopeId).toEqual(3);
  expect(output.data.name).toBeNull();

  const err = { scopeId: ['This is an error'] };
  setError(output, 'scopeId', 'This is an error');

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

  const cleared = noErrors(output);
  assert(!cleared.valid);
  expect(cleared.empty).toEqual(false);
  expect(cleared.errors).toStrictEqual({});
  expect(cleared.data.scopeId).toEqual(output.data.scopeId);
  expect(cleared.data.name).toEqual(output.data.name);
});

test('Default values', async () => {
  await expect(
    superValidate(null, z.object({ id: z.literal(123) }))
  ).rejects.toThrowError(
    'Unsupported default value for schema field(s): "id" (ZodLiteral). Add default, optional or nullable to those fields in the schema.'
  );

  const d = new Date();

  // Note that no default values for strings are needed,
  // they will be set to '' automatically.
  const e1 = await superValidate(null, userForm, {
    defaults: {
      id: undefined,
      createdAt: () => d, // Must use a callback, since field has a default in the schema
      isBool: true
    }
  });

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
  const e = await superValidate(null, _dataTypeForm, {
    // Must use a callback, since field has a default in the schema
    defaults: { date: () => d, coercedDate: d }
  });

  expect(e.data).toStrictEqual({
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
  expect(form.message).toEqual(null);

  expect(form.constraints).toStrictEqual({
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
    numberArray: { required: true }
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
    message: null,
    constraints: {
      color: { required: true },
      fruit: { required: true },
      fruitsstring: { required: true }
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
    message: null,
    constraints: {
      color: { required: true },
      fruit: { required: true },
      fruitsstring: { required: true }
    },
    meta: undefined
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
    message: null,
    constraints: {
      agree: { required: true },
      fruit: { required: true },
      number: { min: 0, required: true }
    },
    meta: undefined
  });
});
