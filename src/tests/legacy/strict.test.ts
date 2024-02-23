import { zod } from '$lib/adapters/zod.js';
import { superValidate } from '$lib/superValidate.js';
import { expect, test, describe } from 'vitest';
import { z, type AnyZodObject } from 'zod';

type ModeTest = {
	name: string;
	schema: AnyZodObject;
	input: Record<string, unknown> | null | undefined;
	expected: Record<string, unknown>;
	valid: boolean;
	errors: Record<string, unknown>;
};

describe('Strict mode', () => {
	test('Should remove keys not part of the schema', async () => {
		const input = { fooo: 'wrong-key', foo: 'correct-key' };

		const schema = z.object({
			foo: z.string()
		});

		const form = await superValidate(input as Record<string, unknown>, zod(schema), {
			strict: true
		});

		expect(form.data).toEqual({ foo: 'correct-key' });
		expect(form.errors).toEqual({});
		expect(form.valid).toEqual(true);
	});

	describe('Should not allow missing boolean fields', () => {
		test('With FormData', async () => {
			const formData = new FormData();

			const schema = z.object({
				enabled: z.boolean()
			});

			const form = await superValidate(formData, zod(schema), {
				strict: true
			});

			expect(form.valid).toBe(false);
			expect(form.errors).toEqual({ enabled: ['Required'] });
		});

		test('With an object', async () => {
			const data = {};

			const schema = z.object({
				enabled: z.boolean()
			});

			const form = await superValidate(data, zod(schema), {
				strict: true
			});

			expect(form.valid).toBe(false);
			expect(form.errors).toEqual({ enabled: ['Required'] });
		});
	});

	const strictTests = [
		{
			name: 'Should be invalid if foo is not present in object',
			schema: z.object({
				foo: z.string()
			}),
			input: {},
			expected: {
				foo: ''
			},
			valid: false,
			errors: {
				foo: ['Required']
			}
		},
		{
			name: 'Should be valid if foo is not present but optional in object',
			schema: z.object({
				foo: z.string().optional()
			}),
			input: {},
			expected: {},
			valid: true,
			errors: {}
		},
		{
			name: 'Should be valid if foo is not present but a default value exists',
			schema: z.object({
				foo: z.string().default('Test')
			}),
			input: {},
			expected: { foo: 'Test' },
			valid: true,
			errors: {}
		},
		{
			name: 'Should be invalid if key is mispelled',
			schema: z.object({
				foo: z.string()
			}),
			input: {
				fo: 'bar'
			},
			expected: {
				foo: ''
			},
			valid: false,
			errors: {
				foo: ['Required']
			}
		},
		{
			name: 'Should work with number',
			schema: z.object({
				cost: z.number()
			}),
			input: {
				cost: 20
			},
			expected: {
				cost: 20
			},
			valid: true,
			errors: {}
		},
		{
			name: 'Should work with a string with min length requirements',
			schema: z.object({
				foo: z.string().min(2)
			}),
			input: {
				foo: ''
			},
			expected: {
				foo: ''
			},
			valid: false,
			errors: {
				foo: ['String must contain at least 2 character(s)']
			}
		},
		{
			name: 'Should be invalid and display errors if null is passed',
			schema: z.object({
				foo: z.string()
			}),
			input: null,
			expected: {
				foo: ''
			},
			valid: false,
			errors: {
				foo: ['Required']
			}
		},
		{
			name: 'Should be invalid and display errors if undefined is passed',
			schema: z.object({
				foo: z.string()
			}),
			input: undefined,
			expected: {
				foo: ''
			},
			valid: false,
			errors: {
				foo: ['Required']
			}
		}
	];

	testMode(strictTests, true);
});

describe('Non-strict mode', () => {
	test('Should remove keys not part of the schema', async () => {
		const input = { fooo: 'wrong-key', foo: 'correct-key' };
		const schema = z.object({
			foo: z.string()
		});

		const form = await superValidate(input as Record<string, unknown>, zod(schema));

		expect(form.data).toEqual({ foo: 'correct-key' });
		expect(form.errors).toEqual({});
		expect(form.valid).toEqual(true);
	});

	const nonStrictTests = [
		{
			name: 'Should be valid if foo is not present in object',
			schema: z.object({
				foo: z.string()
			}),
			input: {},
			expected: {
				foo: ''
			},
			valid: true,
			errors: {}
		},
		{
			name: 'Should be valid if foo is not present but optional in object',
			schema: z.object({
				foo: z.string().optional()
			}),
			input: {},
			expected: {},
			valid: true,
			errors: {}
		},
		{
			name: 'Should be valid if key is mispelled, default value will be used',
			schema: z.object({
				foo: z.string()
			}),
			input: {
				fo: 'bar'
			},
			expected: {
				foo: ''
			},
			valid: true,
			errors: {}
		},
		{
			name: 'Should work with number',
			schema: z.object({
				cost: z.number()
			}),
			input: {
				cost: 20
			},
			expected: {
				cost: 20
			},
			valid: true,
			errors: {}
		},
		{
			name: 'Should work with a string with min length requirements',
			schema: z.object({
				foo: z.string().min(2)
			}),
			input: {
				foo: ''
			},
			expected: {
				foo: ''
			},
			valid: false,
			errors: {
				foo: ['String must contain at least 2 character(s)']
			}
		},
		{
			name: 'Should be invalid and not display errors if null is passed',
			schema: z.object({
				foo: z.string()
			}),
			input: null,
			expected: {
				foo: ''
			},
			valid: false,
			errors: {}
		},
		{
			name: 'Should be invalid and not display errors if undefined is passed',
			schema: z.object({
				foo: z.string()
			}),
			input: undefined,
			expected: {
				foo: ''
			},
			valid: false,
			errors: {}
		}
	];

	testMode(nonStrictTests, false);
});

function testMode(tests: ModeTest[], strict: boolean) {
	for (const { name, input, schema, valid, expected, errors } of tests) {
		const inputClone = input ? structuredClone(input) : input;

		test(name + ' (POJO)', async () => {
			const form = await superValidate(input, zod(schema), {
				strict
			});

			expect(input).toStrictEqual(inputClone);
			expect(form.data).toEqual(expected);
			expect(form.errors).toEqual(errors);
			expect(form.valid).toEqual(valid);
		});

		if (!input) continue;

		test(name + ' (FormData)', async () => {
			const formData = new FormData();
			for (const [key, value] of Object.entries(input)) {
				formData.set(key, value ? `${value}` : '');
			}

			const form = await superValidate(formData, zod(schema), {
				strict
			});

			expect(input).toStrictEqual(inputClone);
			expect(form.data).toEqual(expected);
			expect(form.errors).toEqual(errors);
			expect(form.valid).toEqual(valid);
		});

		test(name + ' (UrlSearchParams)', async () => {
			const params = new URLSearchParams();
			for (const [key, value] of Object.entries(input ?? {})) {
				params.set(key, `${value}`);
			}

			const form = await superValidate(params, zod(schema), {
				strict
			});

			expect(input).toStrictEqual(inputClone);
			expect(form.data).toEqual(expected);
			expect(form.errors).toEqual(errors);
			expect(form.valid).toEqual(valid);
		});
	}
}
