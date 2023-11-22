import { describe, it, expect } from 'vitest';
import { object, string, email, minLength, array } from 'valibot';
import { superValidate } from '$lib/superValidate.js';
import { z } from 'zod';
import { ZodSchemaMeta } from '$lib/schemaMeta/zod.js';

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

describe('Typeschema validation test', () => {
	describe('Valibot', () => {
		const schema = object({
			name: string(),
			email: string([email()]),
			tags: array(string([minLength(2)]))
		});

		const errors = { email: 'Invalid email', tags: { '0': 'Invalid length' } };

		it('should work with schema only', async () => {
			const output = await superValidate(schema, null, { defaults });
			expect(output.data).toEqual(defaults);
			expect(output.data).not.toBe(defaults);
			expect(output.errors).toEqual({});
			expect(output.constraints).toEqual({});
			// @ts-expect-error cannot assign to never
			output.constraints = {};

			const output2 = await superValidate(schema, null, { defaults, errors: true });
			expect(output2.data).toEqual(defaults);
			expect(output2.data).not.toBe(defaults);
			expect(output2.errors).toEqual(errors);
		});

		it('should work with testdata', async () => {
			const output = await superValidate(schema, testData, { defaults });
			expect(output.data).toEqual(expectedData);
			expect(output.errors).toEqual(errors);
		});
	});

	describe('Zod', () => {
		const schema = z.object({
			name: z.string(),
			email: z.string().email(),
			tags: z.string().min(2).array().default(['A'])
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

			const output2 = await superValidate(schema, null, { errors: true });
			expect(output2.data).toEqual(defaults);
			expect(output2.data).not.toBe(defaults);
			expect(output2.errors).toEqual(errors);
		});

		it('should work with testdata', async () => {
			const zodDefaults = new ZodSchemaMeta(schema).defaults;
			expect(zodDefaults).toEqual(defaults);

			const output = await superValidate(schema, testData);
			expect(output.data).toEqual(expectedData);
			expect(output.errors).toEqual(errors);
		});
	});
});
