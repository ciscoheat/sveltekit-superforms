import type { ValidationAdapter } from '$lib/adapters/adapters.js';
import { zod } from '$lib/adapters/zod.js';
import { superValidate } from '$lib/superValidate.js';
import { stringify } from 'devalue';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

async function validate(data: unknown, schema: ValidationAdapter<Record<string, unknown>>) {
	const formInput = new FormData();

	formInput.set('__superform_json', stringify(data));
	try {
		return await superValidate(formInput, schema);
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

	test('Union with schema', async () => {
		const form = await validate({ type: 'extra' }, zod(schema));
		expect(form.data).toEqual({ type: 'extra', options: [] });
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
