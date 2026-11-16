import { zod as zod4 } from '#lib/adapters/zod4.js';
import { superValidate } from '#lib/superValidate.js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';

describe('Issue #708 - FormData number coercion', () => {
	const schema = z.object({
		int: z.number().int(),
		num: z.number(),
		big: z.bigint()
	});

	async function validate(values: Partial<Record<'int' | 'num' | 'big', string>>) {
		const formData = new FormData();
		for (const [key, value] of Object.entries({ int: '1', num: '1', big: '1', ...values })) {
			formData.set(key, value);
		}
		return superValidate(formData, zod4(schema));
	}

	it('should parse complete numbers', async () => {
		const form = await validate({ int: ' -12 ', num: '1.5', big: '123456789123456789' });
		expect(form.valid).toBe(true);
		expect(form.data).toEqual({ int: -12, num: 1.5, big: BigInt('123456789123456789') });
	});

	it('should parse exponent notation instead of stopping at the exponent', async () => {
		const form = await validate({ int: '1e3', num: '2.5e-1' });
		expect(form.valid).toBe(true);
		expect(form.data.int).toBe(1000);
		expect(form.data.num).toBe(0.25);
	});

	it('should not truncate a decimal posted to an integer field', async () => {
		const form = await validate({ int: '1.9' });
		expect(form.valid).toBe(false);
		expect(form.data.int).toBe(1.9);
		expect(form.errors.int).toBeDefined();
	});

	it.each(['12abc', '1,5', '0x10', '1 2'])('should not accept "%s" as a number', async (value) => {
		const form = await validate({ int: value, num: value });
		expect(form.valid).toBe(false);
		expect(form.data.int).toBeNaN();
		expect(form.data.num).toBeNaN();
		expect(form.errors.int).toBeDefined();
		expect(form.errors.num).toBeDefined();
	});

	it.each(['abc', '1.5'])(
		'should return a field error instead of throwing for bigint "%s"',
		async (value) => {
			const form = await validate({ big: value });
			expect(form.valid).toBe(false);
			expect(form.errors.big).toBeDefined();
		}
	);
});
