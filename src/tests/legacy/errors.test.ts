import { zod, zodToJSONSchema } from '$lib/adapters/zod.js';
import { schemaShape } from '$lib/jsonSchema/schemaShape.js';
import { setError, superValidate } from '$lib/superValidate.js';
import { expect, test, describe, assert } from 'vitest';
import { z } from 'zod';

describe('Errors', async () => {
	const schema = z.object({
		scopeId: z.number().int().min(1),
		name: z.string().nullable(),
		object: z.object({ name: z.string() }).optional(),
		arr: z.string().array().optional(),
		enumber: z.enum(['test', 'testing']).optional()
	});

	test('Adding errors with setError', async () => {
		const output = await superValidate({ scopeId: 3, name: null }, zod(schema));

		expect(output.valid).equals(true);
		expect(output.errors).toStrictEqual({});
		expect(output.data.scopeId).toEqual(3);
		expect(output.data.name).toBeNull();

		const err = {
			_errors: ['Form-level error', 'Second form-level error'],
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
		setError(output, 'Form-level error', { overwrite: true });
		setError(output, 'Second form-level error');

		assert(!output.valid);
		expect(output.errors).toStrictEqual(err);
	});

	test('Missing fields in non-strict mode', async () => {
		// Should not fail, since not strict mode and name is nullable.
		const output = await superValidate({ scopeId: 3 }, zod(schema));

		assert(output.valid);
		expect(output.errors).toEqual({});
		expect(output.data).toEqual({
			name: null,
			scopeId: 3
		});
	});

	test('Clearing errors with noErrors', async () => {
		const schema = z.object({
			scopeId: z.number().int().min(1),
			name: z.string().nullable()
		});

		const output = await superValidate({ scopeId: 0, name: 'abc' }, zod(schema));

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
			zod(nestedSchema)
		);

		expect(form.errors).toStrictEqual({
			id: ['Number must be greater than 0'],
			users: {
				'0': {
					name: ['String must contain at least 2 character(s)', 'Invalid'],
					posts: {
						_errors: ['Array must contain at least 2 element(s)'],
						'0': {
							subject: ['String must contain at least 1 character(s)']
						}
					}
				}
			}
		});
	});

	test('Form-level errors', async () => {
		const refined = z.object({ name: z.string().min(1) }).refine(() => false, 'Form-level error');

		const form0 = await superValidate(null, zod(refined));

		assert(form0.valid === false);
		expect(form0.errors).toStrictEqual({});

		const form = await superValidate({ name: 'Abc' }, zod(refined));

		assert(form.valid === false);
		expect(form.errors).toStrictEqual({
			_errors: ['Form-level error']
		});

		expect(form.errors._errors).toStrictEqual(['Form-level error']);

		const form2 = await superValidate({ name: '' }, zod(refined));

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
		const refined = z.object({ name: z.string().min(1) }).refine(() => false, 'Form-level error');

		const form = await superValidate({ name: '' }, zod(refined), {
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

		const form = await superValidate(data, zod(schema));

		expect(form).toStrictEqual({
			id: '1ozqkwe',
			valid: false,
			errors: { _errors: ["Can't order more flavours than scoops!"] },
			data: { scoops: 1, flavours: ['Mint choc chip', 'Raspberry ripple'] },
			posted: true
		});
	});

	test('Array errors, not strict mode', async () => {
		const schema = z.object({
			name: z.string(),
			tags: z.string().min(1).array().min(2)
		});

		const form = await superValidate({ tags: [''] }, zod(schema));

		assert(!form.valid);
		expect(form.data).toEqual({
			name: '',
			tags: ['']
		});
		expect(form.errors).toStrictEqual({
			tags: {
				'0': ['String must contain at least 1 character(s)'],
				_errors: ['Array must contain at least 2 element(s)']
			}
		});

		const form2 = await superValidate({ tags: ['only one'] }, zod(schema));

		assert(!form2.valid);
		expect(form2.errors).toStrictEqual({
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
		expect(schemaShape(zodToJSONSchema(schema))).toStrictEqual({
			tags: { names: {}, test: {} }
		});
	});

	test('Array errors with nested errors', async () => {
		const form = await superValidate(
			{ tags: [{ id: 123, names: ['a'], test: 'test' }] },
			zod(schema)
		);
		expect(form.errors.tags?._errors).toEqual(['Array must contain at least 2 element(s)']);
		expect(form.errors.tags?.[0].names?.[0]).toEqual([
			'String must contain at least 2 character(s)'
		]);
	});

	test('Array errors without nested errors', async () => {
		const form = await superValidate(
			{ tags: [{ id: 123, names: ['aa'], test: ['aaa'] }] },
			zod(schema)
		);
		expect(form.errors.tags?._errors).toEqual(['Array must contain at least 2 element(s)']);
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
		zod(iceCream)
	);

	assert(form.valid == false);
	expect(form.errors).toStrictEqual({
		flavours: { _errors: ["Can't order more flavours than scoops!"] }
	});
});

test('Error on posting nested data in dataType form mode', async () => {
	const registrationSchema = z.object({
		username: z.string(),
		credential: z.object({
			id: z.string(),
			publicKey: z.string(),
			algorithm: z.string()
		}),
		authenticatorData: z.string(),
		clientData: z.string()
	});

	const schema = z.object({
		email: z.string().email(),
		registration: registrationSchema.optional()
	});

	const formData = new FormData();
	formData.set('email', 'asd@asd.commm');
	formData.set(
		'registration',
		'{"username":"asd@asd.commm","credential":{"id":"6igsmeLIsd2jTAraOL1QX4qUWjdtvBX3gMeEHOR-QcU","publicKey":"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEOdtZo4FdtR2AAU6pR0u9d4qJcLsfnCM18No1lwTjx-7sJds6sr4SI721yzwDMYIB1L8frZkuUs1JK4Rq5C4fYg==","algorithm":"ES256"},"authenticatorData":"SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAQECAwQFBgcIAQIDBAUGBwgAIOooLJniyLHdo0wK2ji9UF-KlFo3bbwV94DHhBzkfkHFpQECAyYgASFYIDnbWaOBXbUdgAFOqUdLvXeKiXC7H5wjNfDaNZcE48fuIlgg7CXbOrK-EiO9tcs8AzGCAdS_H62ZLlLNSSuEauQuH2I=","clientData":"eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiU1llTVR5aHpmaHFXaUx4ZyIsIm9yaWdpbiI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyIsImNyb3NzT3JpZ2luIjpmYWxzZX0="}'
	);

	await expect(superValidate(formData, zod(schema))).rejects.toThrow(
		/\[registration\] Object type found./
	);
});

test('Nested errors in an optional object', async () => {
	const optionalNestedSchemaNoDefault = z.object({
		a: z.string(),
		nested: z.object({ b: z.string() }).optional()
	});

	const form = await superValidate(zod(optionalNestedSchemaNoDefault));
	form.data.a = '';

	// Type checking
	const err: string[] | undefined = form.errors.nested?.b;
	const b: string | undefined = form.data.nested?.b;

	expect(err).toBeUndefined();
	expect(b).toBeUndefined();
});

test('Nested errors in an optional object', async () => {
	// Typescript error when assigning $form.nested = undefined (not considered as optional)
	const optionalNestedSchemaWithDefaultValue = z.object({
		a: z.string(),
		nested: z
			.object({ b: z.string() })
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.default(undefined as any)
			.optional()
	});

	const form = await superValidate(zod(optionalNestedSchemaWithDefaultValue));

	// Type checking
	form.data.a = '';

	const err: string[] | undefined = form.errors.nested?.b;

	if (form.data.nested) {
		const b: string | undefined = form.data.nested.b;
		expect(b).toBeUndefined();
	}

	expect(err).toBeUndefined();

	expect(form.data.nested).toBeUndefined();
});
