import { zod } from '$lib/adapters/zod.js';
import { superValidate } from '$lib/superValidate.js';
import { stringify } from 'devalue';
import { describe, test } from 'vitest';
import { z } from 'zod';

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

async function validate(data: unknown) {
	const formInput = new FormData();

	formInput.set('__superform_json', stringify(data));
	try {
		await superValidate(formInput, FormSchema);
	} catch (err) {
		console.error(err);
		//
		throw err;
	}
}

describe('Demo', () => {
	test('Bad', async () => {
		const data = {
			addresses: {
				additional: {
					type: 'poBox',
					name: ''
				}
			}
		} satisfies FormSchema;
		await validate(data);
	});

	test('Good', async () => {
		const data = {
			addresses: {
				additional: {
					type: 'none'
				}
			}
		} satisfies FormSchema;
		await validate(data);
	});
});
