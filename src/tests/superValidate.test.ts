import { describe, it, expect } from 'vitest';
import { object, string, email, minLength, array } from 'valibot';
import { superValidate } from '$lib/superValidate.js';
import { z } from 'zod';
import { constraints, defaultValues } from '$lib/jsonSchema.js';
import { zod, zodToJsonSchema } from '$lib/adapters/zod.js';
import { Foo, bigZodSchema } from './data.js';
import { valibot } from '$lib/adapters/valibot.js';

const defaults = { name: '', email: '', tags: ['A'] };
const testData = { name: 'Ok', email: '' };
const expectedData = { name: 'Ok', email: '', tags: ['A'] };
const expectedConstraints = {
	email: {
		required: true
	},
	name: {
		required: true
	},
	tags: {
		minlength: 2,
		required: true
	}
};

describe('superValidate', () => {
	describe('with Valibot', () => {
		const schema = object({
			name: string(),
			email: string([email()]),
			tags: array(string([minLength(2)]), [minLength(2)])
		});

		const errors = { email: 'Invalid email', tags: { '0': 'Invalid length' } };

		it('should work with adapter only', async () => {
			const output = await superValidate(valibot(schema, { defaults }));
			expect(output.data).toEqual(defaults);
			expect(output.data).not.toBe(defaults);
			expect(output.errors).toEqual({});
			expect(output.constraints).toEqual({});
			expect(output.message).toBeUndefined();
			// @ts-expect-error cannot assign to never
			output.constraints = {};

			const output2 = await superValidate(valibot(schema, { defaults }), { errors: true });
			expect(output2.data).toEqual(defaults);
			expect(output2.data).not.toBe(defaults);
			expect(output2.errors).toEqual(errors);
			//console.log(output2.errors);
		});

		it('should work with testdata', async () => {
			const output = await superValidate(testData, valibot(schema, { defaults }));
			expect(output.data).toEqual(expectedData);
			expect(output.errors).toEqual(errors);
		});
	});

	describe.only('with Zod', () => {
		const schema = z.object({
			name: z.string(),
			email: z.string().email(),
			tags: z.string().min(2).array().min(2).default(['A'])
		});

		it('should work with defaultValues', () => {
			const values = defaultValues<z.infer<typeof bigZodSchema>>(zodToJsonSchema(bigZodSchema));
			expect(values.foo).toEqual(Foo.A);
		});

		it('should work with constraints', () => {
			const expected = {
				email: { required: true },
				tags: { minlength: 2, required: true },
				foo: { required: true },
				set: { required: true },
				reg1: { pattern: '\\D', required: true },
				reg: { pattern: 'X', minlength: 3, maxlength: 30, required: true },
				num: { min: 10, max: 100, step: 5, required: true },
				date: { min: '2022-01-01T00:00:00.000Z', required: true },
				arr: { minlength: 10, required: true },
				nestedTags: { name: { minlength: 1, required: true } }
			};
			const values = constraints<z.infer<typeof bigZodSchema>>(zodToJsonSchema(bigZodSchema));
			expect(values).toEqual(expected);
		});

		const errors = {
			email: 'Invalid email',
			tags: { '0': 'String must contain at least 2 character(s)' }
		};

		it('should work with schema only', async () => {
			const output = await superValidate(zod(schema));
			expect(output.data).toEqual(defaults);
			expect(output.data).not.toBe(defaults);
			expect(output.errors).toEqual({});
			expect(output.constraints).toEqual(expectedConstraints);
			expect(output.message).toBeUndefined();

			const output2 = await superValidate(zod(schema), { errors: true });
			expect(output2.data).toEqual(defaults);
			expect(output2.data).not.toBe(defaults);
			expect(output2.errors).toEqual(errors);
		});

		it('should work with testdata', async () => {
			const output = await superValidate(testData, zod(schema));
			expect(output.data).toEqual(expectedData);
			expect(output.errors).toEqual(errors);
		});
	});
});
