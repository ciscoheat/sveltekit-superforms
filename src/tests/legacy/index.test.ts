import { setError, setMessage, superValidate } from '$lib/superValidate.js';
import { assert, expect, test, describe } from 'vitest';
import { z } from 'zod';
import { dataTypeForm } from '../data.js';
import { zod } from '$lib/adapters/zod.js';
import { zodToJSONSchema } from '$lib/adapters/zod.js';
import { defaultValues } from '$lib/jsonSchema/schemaDefaults.js';
import { stringify } from 'devalue';
import { schemaShape } from '$lib/jsonSchema/schemaShape.js';

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
	slug: 'john-doe',
	createdAt: new Date(),
	isBool: true,
	nullable: null,
	def: 234
};

const validationErrors = {
	name: ['String must contain at least 2 character(s)']
};

test('Model validation', async () => {
	const validation = await superValidate(model, zod(userForm));
	const data = validation.data;

	expect(validation.valid).toEqual(true);
	expect(validation.errors).toStrictEqual({});
	expect(data).toStrictEqual(model);
});

test('Failed model validation', async () => {
	const testData = { ...model, name: 'A' };
	const validation = await superValidate(testData, zod(userForm));
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

	const validation = await superValidate(formData, zod(userForm));
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

	const validation = await superValidate(formData, zod(userForm));
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

	const validation = await superValidate(formData, zod(userForm));

	expect(validation.data.name).toBeNull();
});

test('FormData array data', async () => {
	const formData = new FormData();

	formData.append('name', 'Nr1');
	formData.append('name', 'Nr2');

	const form = await superValidate(formData, zod(z.object({ name: z.string().array() })));

	expect(form.data.name).toEqual(['Nr1', 'Nr2']);
});

test('Nullable values', async () => {
	const refinedSchema = z
		.object({
			scopeId: z.number().int().min(1),
			name: z.string().nullable()
		})
		.refine((data) => data);

	const output = defaultValues<z.infer<typeof refinedSchema>>(zodToJSONSchema(refinedSchema));
	expect(output.scopeId).equals(0);
	expect(output.name).equals(null);

	const schema = refinedSchema._def.schema;
	const extended = schema
		.extend({
			scopeId: schema.shape.scopeId.default(7)
		})
		.transform((data) => ({ ...data, name: `Test${data.scopeId}` }));

	const output4 = await superValidate({}, zod(extended), { errors: false });
	assert(output4.valid);
	expect(output4.data.scopeId).toEqual(7);
	expect(output4.data.name).toEqual('Test7');

	// If null is passed in and all fields have defaults, return them
	const extSchema = schema.extend({ scopeId: schema.shape.scopeId.default(10) });

	const output2 = defaultValues<z.infer<typeof extSchema>>(zodToJSONSchema(extSchema));
	expect(output2.scopeId).toEqual(10);
	expect(output2.name).toBeNull();
});

test('Optional values', async () => {
	const schema = z.object({
		other: z.string(),
		name: z.string().optional()
	});

	const output = await superValidate({ other: 'Test' }, zod(schema));
	expect(output.valid).equals(true);
	expect(output.message).toBeUndefined();
	expect(output.data.name).toBeUndefined();
	expect(output.data.other).equals('Test');
	expect(output.errors).toStrictEqual({});

	const output2 = await superValidate({ name: 'Name', other: 'Test' }, zod(schema));
	expect(output2.valid).equals(true);
	expect(output2.data.name).equals('Name');
	expect(output2.data.other).equals('Test');
	expect(output.errors).toStrictEqual({});
});

describe('Default values', () => {
	test('With a partial entity', async () => {
		const now = new Date();
		const entity = { createdAt: now };
		const output = await superValidate(entity, zod(AccountSchema.extend({ name: z.string() })));

		assert(output.valid == false);
		expect(output.data).toStrictEqual({
			id: 0,
			createdAt: now,
			name: '',
			phone: null
		});
	});

	test('With no entity and defaultValues', async () => {
		const d = new Date();
		const schema = userForm.extend({
			id: userForm.shape.id.default(undefined as unknown as number),
			isBool: userForm.shape.isBool.default(true),
			createdAt: userForm.shape.createdAt.removeDefault().default(d)
		});

		// Note that no default values for strings are needed,
		// they will be set to '' automatically.
		const e1 = await superValidate(null, zod(schema));

		const expected = {
			name: null,
			email: '',
			id: undefined,
			createdAt: d,
			slug: '',
			isBool: true,
			nullable: null,
			def: 999
		};

		expect(e1.data).toStrictEqual(expected);
		expect(defaultValues(zodToJSONSchema(schema))).toStrictEqual(expected);
	});

	test('With no entity but different fields', async () => {
		const d = new Date();
		const e = await superValidate(
			null,
			zod(
				dataTypeForm.extend({
					date: dataTypeForm.shape.date.removeDefault().default(d),
					coercedDate: dataTypeForm.shape.coercedDate.default(d)
				})
			)
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
			numberArray: [],
			optionalString: undefined,
			proxyString: '',
			trimmedString: '',
			date: d,
			coercedNumber: 0,
			coercedDate: d,
			zodEnum: 'a'
		});

		const form = await superValidate(null, zod(dataTypeForm));

		expect(form.valid).toEqual(false);
		expect(form.errors).toEqual({});
		expect(form.posted).toEqual(false);
		expect(form.message).toBeUndefined();

		expect(form.constraints).toStrictEqual({
			string: { minlength: 2 },
			email: { required: true },
			bool: { required: true },
			number: { required: true },
			proxyNumber: { min: 10 },
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
		const form = await superValidate(null, zod(enumschema));

		expect(form.valid).toEqual(false);
		expect(form.posted).toEqual(false);

		expect(form).toStrictEqual({
			id: '1j8sq2z',
			valid: false,
			errors: {},
			data: {
				color: 'GREEN',
				fruit: [],
				fruitsstring: [],
				gender: null
			},
			posted: false,
			constraints: {
				fruit: { required: true },
				fruitsstring: { required: true }
			},
			shape: {
				fruit: {},
				fruitsstring: {}
			}
		});
	});

	test('Posting Zod enums and native enums', async () => {
		const data = new FormData();
		data.append('fruit', '1');
		data.append('fruit', '0');
		data.append('fruitsstring', 'Apple');
		data.append('fruitsstring', 'Banana');
		data.set('color', 'GRAY');

		const adapter = zod(enumschema);
		const form = await superValidate(data, adapter);

		expect(schemaShape(adapter.jsonSchema)).toEqual({
			fruit: {},
			fruitsstring: {}
		});

		expect(form).toStrictEqual({
			id: '1j8sq2z',
			posted: true,
			valid: true,
			errors: {},
			data: {
				color: 'GRAY',
				fruit: [Fruits.Banana, Fruits.Apple],
				fruitsstring: [FruitsString.Apple, FruitsString.Banana],
				gender: null
			}
		});
	});

	test('Agressive type coercion to avoid schema duplication', async () => {
		const schema = z.object({
			agree: z.literal(true).default(false as true),
			fruit: z.nativeEnum(Fruits).default(undefined as unknown as Fruits),
			number: z.number().positive().default(NaN)
		});

		const form = await superValidate(null, zod(schema));

		expect(form).toStrictEqual({
			id: '1diyedk',
			valid: false,
			errors: {},
			data: { agree: false, number: NaN, fruit: undefined },
			posted: false,
			constraints: {
				fruit: { required: true },
				number: { min: Number.MIN_VALUE }
			}
		});
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

		const form = await superValidate(data, zod(schema));

		expect(form.valid).toEqual(false);
		expect(form.posted).toEqual(true);

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
			zod(nestedSchema)
		);

		expect(form.errors).toStrictEqual({
			id: ['Number must be greater than 0'],
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
		const form = await superValidate(null, zod(nestedSchema));

		expect(form.constraints).toStrictEqual({
			id: { min: Number.MIN_VALUE, required: true },
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
			zod(
				nestedSchema.superRefine((check, ctx) => {
					if (check.id > 100) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: 'Too high ID',
							path: ['id']
						});
					}
				})
			)
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

		const form = await superValidate(data, zod(schema));

		expect(form.valid).toStrictEqual(false);
		expect(form.posted).toStrictEqual(true);

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

		const form = await superValidate(url, zod(urlSchema));

		const expected = {
			valid: true,
			errors: {},
			data: {
				id: 123,
				name: 'A test',
				tags: ['A', 'B', 'C']
			},
			posted: false,
			constraints: {
				id: { min: 1, required: true },
				name: { minlength: 2 },
				tags: { pattern: '^\\w+$', required: true }
			}
		};

		expect(form.data.createdAt.getTime()).toEqual(new Date('2023-04-06').getTime());

		expect(form).toMatchObject(expected);

		const form2 = await superValidate(url.searchParams, zod(urlSchema));

		expect(form2.data.createdAt.getTime()).toEqual(new Date('2023-04-06').getTime());

		expect(form2).toMatchObject(expected);
	});

	test('Call without data', async () => {
		const schema = z.object({
			name: z.string(),
			id: z.number()
		});

		const form = await superValidate(zod(schema), { id: 'test' });

		expect(form).toStrictEqual({
			id: 'test',
			valid: false,
			errors: {},
			data: { name: '', id: 0 },
			posted: false,
			constraints: { name: { required: true }, id: { required: true } }
		});

		const form2 = await superValidate(zod(schema.refine(() => false, 'Some error')), {
			id: 'test2'
		});

		expect(form2).toStrictEqual({
			id: 'test2',
			valid: false,
			errors: {},
			data: { name: '', id: 0 },
			posted: false,
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

		const adapter = zod(imageCreationFormSchema);
		const form = await superValidate(adapter);

		expect(schemaShape(adapter.jsonSchema)).toEqual({
			numbers: {},
			promptMetaData: {}
		});

		expect(form).toStrictEqual({
			id: '1tomocp',
			valid: false,
			errors: {},
			data: {
				textresource: '',
				promptMetaData: { textServiceId: null, imageServiceId: null },
				numbers: {},
				promptExtra: undefined,
				provider: undefined
			},
			posted: false,
			constraints: {
				textresource: { required: true },
				numbers: { required: true }
			},
			shape: {
				numbers: {},
				promptMetaData: {}
			}
		});
	});

	test('setMessage and setError with refined schema', async () => {
		const schema = z
			.object({
				name: z.string(),
				id: z.number()
			})
			.refine((data) => data)
			.refine((data) => data);

		const form = await superValidate({ name: '', id: 0 }, zod(schema));
		assert(form.valid);
		expect(form.message).toBeUndefined();

		setMessage(form, 'A message');
		expect(form.message).toEqual('A message');

		expect(form.errors).toEqual({});
		setError(form, 'id', 'Id error');

		expect(form.errors).toEqual({
			id: ['Id error']
		});
	});

	test('Schema with pipe() and dataType: form (requires preprocessed)', async () => {
		const schema = z.object({
			len: z
				.string()
				.transform((val) => (val ? val.length : 0))
				.pipe(z.number().min(5))
		});

		const form = await superValidate(zod(schema));
		assert(form.valid === false);
		expect(form.data.len).toEqual(0);

		const formData4 = new FormData();
		formData4.set('len', 'four');

		const form4a = await superValidate(formData4, zod(schema));
		assert(form4a.valid === false);
		expect(form4a.data.len).toBeNaN();

		// preprocessed can break type-safety!
		const form4b = await superValidate(formData4, zod(schema), { preprocessed: ['len'] });
		assert(!form4b.valid);
		expect(form4b.data.len).toEqual('four');

		const formData5 = new FormData();
		formData5.set('len', 'fiver');

		const form5a = await superValidate(formData5, zod(schema));
		assert(!form5a.valid);
		expect(form5a.data.len).toBeNaN();

		const form5b = await superValidate(formData5, zod(schema), { preprocessed: ['len'] });
		assert(form5b.valid);
		expect(form5b.data.len).toEqual(5);
	});

	test('Schema with pipe() and dataType: json', async () => {
		const dateStr = '2023-05-28';

		const schema = z.object({
			num: z.number().or(z.string()).pipe(z.coerce.number()).default(0),
			date: z
				.union([z.number(), z.string(), z.date()])
				.pipe(z.coerce.date())
				.default(new Date(dateStr))
		});

		const form = await superValidate(zod(schema));
		assert(form.valid === false);
		expect(form.data.num).toEqual(0);
		expect(form.data.date.toISOString().substring(0, 10)).toEqual(dateStr);

		const data = stringify({ date: new Date(dateStr), num: 123 });

		const formData4 = new FormData();
		formData4.set('__superform_json', data);

		const form4 = await superValidate(formData4, zod(schema));
		assert(form4.valid === true);
		expect(form4.data.date.toISOString().substring(0, 10)).toEqual(dateStr);
		expect(form4.data.num).toEqual(123);
	});

	test('Passthrough validation', async () => {
		const schema = z.object({
			name: z.string().min(2)
		});

		const data = {
			name: 'test',
			extra: 'field'
		};

		const form = await superValidate(data, zod(schema.passthrough()));
		assert(form.valid === true);
		expect(form.data).toStrictEqual({
			name: 'test',
			extra: 'field'
		});

		const failedData = {
			name: '',
			extra2: 'field2'
		};

		const form2 = await superValidate(failedData, zod(schema.passthrough()));
		assert(form2.valid === false);
		expect(form2.data).toStrictEqual({
			name: '',
			extra2: 'field2'
		});

		const data3 = {
			name: 'test',
			extra: 'field'
		};

		const form3 = await superValidate(data3, zod(schema));
		assert(form3.valid === true);
		expect(form3.data).toStrictEqual({
			name: 'test'
		});

		const failedData2 = {
			name: '',
			extra2: 'field2'
		};

		const form4 = await superValidate(failedData2, zod(schema));
		assert(form4.valid === false);
		expect(form4.data).toStrictEqual({
			name: ''
		});
	});

	test('Preprocessed fields', async () => {
		const schema = z.object({
			tristate: z.preprocess(
				(value) => (value === undefined ? undefined : Boolean(value)),
				z.boolean().optional()
			)
		});

		const formData = new FormData();

		const form = await superValidate(formData, zod(schema), {
			preprocessed: ['tristate']
		});

		assert(form.valid);
		expect(form.data.tristate).toBeUndefined();
	});
});
