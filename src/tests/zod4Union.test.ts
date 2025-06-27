import type { Infer, ValidationAdapter } from '$lib/adapters/adapters.js';
import { zod } from '$lib/adapters/zod4.js';
import { superValidate } from '$lib/superValidate.js';
import { stringify } from 'devalue';
import { assert, describe, expect, test } from 'vitest';
import { z } from 'zod/v4';

async function validate<T extends Record<string, unknown>>(
	data: T,
	schema: ValidationAdapter<T>,
	strict = false
) {
	const formInput = new FormData();

	formInput.set('__superform_json', stringify(data));
	try {
		return await superValidate(formInput, schema, { strict });
	} catch (err) {
		console.error(err);
		//
		throw err;
	}
}

describe('New discriminatedUnion features', () => {
	test('Unions and pipes', async () => {
		const MyResult = z.discriminatedUnion('status', [
			// simple literal
			z.object({ status: z.literal('aaa'), data: z.string() }),
			// union discriminator
			z.object({ status: z.union([z.literal('bbb'), z.literal('ccc')]) }),
			// pipe discriminator
			z.object({ status: z.literal('fail').transform((val) => val.toUpperCase()) })
		]);

		const form = await validate({ status: 'bbb' }, zod(MyResult));
		expect(form.valid).toBe(true);
	});

	test('Composed unions', async () => {
		const BaseError = z.object({ status: z.literal('failed'), message: z.string() });

		const MyResult = z.discriminatedUnion('status', [
			z.object({ status: z.literal('success'), data: z.string() }),
			z.discriminatedUnion('code', [
				BaseError.extend({ code: z.literal(400) }),
				BaseError.extend({ code: z.literal(401) }),
				BaseError.extend({ code: z.literal(500) })
			])
		]);

		const form = await validate({ status: 'failed', message: 'FAIL', code: 401 }, zod(MyResult));
		expect(form.valid).toBe(true);

		assert(form.data.status === 'failed');
		assert(form.data.message === 'FAIL');
		assert(form.data.code === 401);
	});

	test('A complicated union', async () => {
		const ZodSchema2 = z.discriminatedUnion('type', [
			z.object({
				type: z.literal('empty')
			}),
			z.object({
				type: z.literal('additional'),
				additional: z.discriminatedUnion('type', [
					z.object({
						type: z.literal('poBox'),
						name: z
							.string()
							.min(1, 'min len')
							.max(10, 'max len')
							.default(null as unknown as string)
					}),
					z.object({
						type: z.literal('none')
					})
				])
			})
		]);

		const FormSchema = zod(ZodSchema2);
		type FormSchema = (typeof FormSchema)['defaults'];

		{
			const data = {
				type: 'additional',
				additional: {
					// @ts-expect-error Testing with invalid data
					type: 123,
					name: ''
				}
			} satisfies FormSchema;

			// @ts-expect-error Testing with invalid data
			const form = await validate(data, FormSchema);
			expect(form.valid).toBe(false);
			expect(form.data).toEqual({
				type: 'additional',
				additional: {
					type: 'none',
					name: ''
				}
			});
		}

		{
			const data = {
				type: 'additional',
				additional: {
					type: 'poBox',
					name: ''
				}
			} satisfies FormSchema;

			const form = await validate(data, FormSchema);
			expect(form.valid).toBe(false);
			expect(form.data).toEqual(data);
		}
	});
});

describe('Default discriminated union values 1', () => {
	const schema = z.discriminatedUnion('type', [
		z.object({ type: z.literal('empty') }),
		z.object({ type: z.literal('extra'), options: z.string().array() })
	]);

	test('Union with schema 1', async () => {
		const form = await validate({ type: 'empty' }, zod(schema));
		expect(form.valid).toBe(true);
		expect(form.data).toEqual({ type: 'empty' });
	});

	test('Union with schema 2', async () => {
		const form = await validate({ type: 'extra' } as Infer<typeof schema>, zod(schema), true);
		expect(form.valid).toBe(false);
		expect(form.data).toEqual({ type: 'extra', options: [] });
	});

	test('Nested discriminated union with default value', async () => {
		const nested = z.object({
			addresses: z.object({
				additional: z
					.discriminatedUnion('type', [
						z.object({
							type: z.literal('poBox'),
							name: z.string().min(1, 'min len').max(10, 'max len')
						}),
						z.object({
							type: z.literal('none')
						})
					])
					.default({
						type: 'none'
					})
			})
		});

		const form1 = await superValidate(zod(nested));
		expect(form1.data.addresses.additional).toEqual({ type: 'none' });

		const form2 = await validate(
			{
				addresses: {
					additional: {
						type: 'poBox',
						name: '#123'
					}
				}
			},
			zod(nested)
		);

		expect(form2.valid).toBe(true);
		assert(form2.data.addresses.additional?.type === 'poBox');
		expect(form2.data.addresses.additional.name).toBe('#123');
	});
});

describe('Default discriminated union values 2', () => {
	const ZodSchema = z.object({
		addresses: z.object({
			additional: z.discriminatedUnion('type', [
				z.object({
					type: z.literal('poBox'),
					name: z.string().min(1, 'min len').max(10, 'max len')
				}),
				z.object({
					type: z.literal('none')
				})
			])
		})
	});
	const FormSchema = zod(ZodSchema);
	type FormSchema = (typeof FormSchema)['defaults'];

	test('Bad', async () => {
		const data = {
			addresses: {
				additional: {
					type: 'poBox',
					name: ''
				}
			}
		} satisfies FormSchema;
		await validate(data, FormSchema);
	});

	test('Good', async () => {
		const data = {
			addresses: {
				additional: {
					type: 'none'
				}
			}
		} satisfies FormSchema;
		await validate(data, FormSchema);
	});
});

test('Default value with *matching* type in nested discriminated union with superRefine', async () => {
	const ZodSchema2 = z
		.object({
			type: z.literal('additional'),
			additional: z
				.discriminatedUnion('type', [
					z.object({
						type: z.literal('same'),
						address: z.string().nullable()
					}),
					z.object({
						type: z.literal('different'),
						address: z.string()
					})
				])
				.default({
					type: 'same',
					address: null
				})
		})
		.superRefine((_data, ctx) => {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['addresses', 'additional', 'name'],
				message: 'error'
			});
		});

	const FormSchema = zod(ZodSchema2);
	type FormSchema = (typeof FormSchema)['defaults'];
	const data = {
		type: 'additional',
		additional: {
			type: 'different',
			address: '123 Main St'
		}
	} satisfies FormSchema;
	await validate(data, FormSchema);
});
