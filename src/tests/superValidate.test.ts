import { describe, it, expect } from 'vitest';
import { object, string, email, minLength, array } from 'valibot';
import { superValidate } from '$lib/superValidate.js';
import { z } from 'zod';
import { constraints, defaultValues } from '$lib/schemaMeta/jsonSchema.js';
import { zodToJsonSchema } from '$lib/schemaMeta/zod.js';

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

enum Foo {
	A = 2,
	B = 3
}

const bigZodSchema = z.object({
	name: z.union([z.string().default('B'), z.number()]).default('A'),
	email: z.string().email(),
	tags: z.string().min(2).array().min(2).default(['A']),
	foo: z.nativeEnum(Foo),
	set: z.set(z.string()),
	reg1: z.string().regex(/\D/).regex(/p/),
	reg: z.string().regex(/X/).min(3).max(30),
	num: z.number().int().multipleOf(5).min(10).max(100),
	date: z.date().min(new Date('2022-01-01')),
	arr: z
		.union([z.string().min(10), z.date()])
		.array()
		.min(3)
		.max(10),
	nestedTags: z.object({
		id: z.number().int().positive().optional(),
		name: z.string().min(1)
	})
});

describe('superValidate', () => {
	describe('with Valibot', () => {
		const schema = object({
			name: string(),
			email: string([email()]),
			tags: array(string([minLength(2)]), [minLength(2)])
		});

		const errors = { email: 'Invalid email', tags: { '0': 'Invalid length' } };

		it('should work with schema only', async () => {
			const output = await superValidate(schema, null, { defaults });
			expect(output.data).toEqual(defaults);
			expect(output.data).not.toBe(defaults);
			expect(output.errors).toEqual({});
			expect(output.constraints).toEqual({});
			expect(output.message).toBeUndefined();
			// @ts-expect-error cannot assign to never
			output.constraints = {};

			const output2 = await superValidate(schema, null, { defaults, errors: true });
			expect(output2.data).toEqual(defaults);
			expect(output2.data).not.toBe(defaults);
			expect(output2.errors).toEqual(errors);
			//console.log(output2.errors);
		});

		it('should work with testdata', async () => {
			const output = await superValidate(schema, testData, { defaults });
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
			const values = constraints<z.infer<typeof bigZodSchema>>(zodToJsonSchema(bigZodSchema), {
				multipleRegexps: false
			});
			expect(values).toEqual(expected);
		});

		const errors = {
			email: 'Invalid email',
			tags: { '0': 'String must contain at least 2 character(s)' }
		};

		it('should work with schema only', async () => {
			const output = await superValidate(schema);
			expect(output.data).toEqual(defaults);
			expect(output.data).not.toBe(defaults);
			expect(output.errors).toEqual({});
			expect(output.constraints).toEqual(expectedConstraints);
			expect(output.message).toBeUndefined();

			const output2 = await superValidate(schema, null, { errors: true });
			expect(output2.data).toEqual(defaults);
			expect(output2.data).not.toBe(defaults);
			expect(output2.errors).toEqual(errors);
		});

		it('should work with testdata', async () => {
			const output = await superValidate(schema, testData);
			expect(output.data).toEqual(expectedData);
			expect(output.errors).toEqual(errors);
		});
	});
});
