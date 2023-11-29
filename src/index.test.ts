import { describe, it, expect } from 'vitest';
import { object, string, email, minLength, array } from 'valibot';
import { superValidate } from '$lib/superValidate.js';
import { z } from 'zod';
import { ZodSchemaMeta, zodToJSONSchema, zodToJsonSchema } from '$lib/schemaMeta/zod.js';
import { validate } from '@decs/typeschema';
import { defaultValues } from '$lib/schemaMeta/jsonSchema.js';
import type { JSONSchema7 } from 'json-schema';

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

	enum Foo {
		A = 2,
		B = 3
	}

	describe('Zod', () => {
		const schema = z.object({
			name: z.union([z.string().default('B'), z.number()]).default('A'),
			email: z.string().email(),
			tags: z.string().min(2).array().min(2).default(['A']),
			foo: z.nativeEnum(Foo),
			d: z.set(z.string())
		});

		const errors = {
			email: 'Invalid email',
			tags: { '0': 'String must contain at least 2 character(s)' }
		};

		it('should work with typeschema', async () => {
			//console.dir(await validate(schema, {}), { depth: 10 });
		});

		it('should transform a Zod schema to JSON schema', () => {
			console.dir(zodToJsonSchema(schema), { depth: 10 });
		});

		it('should work with defaultValues', () => {
			const values = defaultValues<z.infer<typeof schema>>(zodToJsonSchema(schema) as JSONSchema7);
			expect(values.foo).toEqual(Foo.A);
			console.dir(values, { depth: 10 });
		});

		/*
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
			console.log(output2.errors);
		});

		it('should work with testdata', async () => {
			const output = await superValidate(schema, testData);
			expect(output.data).toEqual(expectedData);
			expect(output.errors).toEqual(errors);
		});
		*/
	});
});
