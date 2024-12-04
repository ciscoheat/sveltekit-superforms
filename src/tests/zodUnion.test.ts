import type { Infer, ValidationAdapter } from '$lib/adapters/adapters.js';
import { zod } from '$lib/adapters/zod.js';
import { superValidate } from '$lib/superValidate.js';
import { stringify } from 'devalue';
import { assert, describe, expect, test } from 'vitest';
import { z } from 'zod';

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
