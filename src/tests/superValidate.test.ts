import { describe, it, expect } from 'vitest';
import { object, string, email, minLength, array } from 'valibot';
import { superValidate } from '$lib/superValidate.js';
import { z } from 'zod';
import { constraints, defaultValues, type JSONSchema } from '$lib/jsonSchema.js';
import { zod, zodToJsonSchema } from '$lib/adapters/zod.js';
import { Foo, bigZodSchema } from './data.js';
import { valibot } from '$lib/adapters/valibot.js';
import type { ValidationAdapter } from '$lib/adapters/index.js';
import { ajv } from '$lib/adapters/ajv.js';
import merge from 'ts-deepmerge';

/* 
TEST SCHEMA TEMPLATE:
{
	name: string, min length 2
	email: string (email format)
	tags: string array, min length 2 for both string and array.
}
*/

/**
 * Input data to superValidate
 * Should give no errors
 */
const validData = { name: 'Ok', email: 'test@example.com', tags: ['Ok 1', 'Ok 2'] };

/**
 * Input data to superValidate
 * Should give error on email and tags
 */
const invalidData = { name: 'Ok', email: '' };

/**
 * What should be returned when no data is sent to superValidate
 */
const defaults = { name: '', email: '', tags: ['A'] };

/**
 * Expected constraints
 */
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

function schemaTest(
	adapter: () => ValidationAdapter<Record<string, unknown>>,
	expectedErrors: Record<string, unknown>,
	testConstraints: boolean
) {
	it('with schema only', async () => {
		const output = await superValidate(adapter());
		expect(output.valid).toEqual(false);
		expect(output.errors).toEqual({});
		expect(output.data).not.toBe(defaults);
		expect(output.data).toEqual(defaults);
		expect(output.message).toBeUndefined();
		if (testConstraints) expect(output.constraints).toEqual(expectedConstraints);
	});

	it('with schema only and initial errors', async () => {
		const output = await superValidate(adapter(), { errors: true });
		expect(output.valid).toEqual(false);
		expect(output.errors).toEqual(expectedErrors);
		expect(output.data).not.toBe(defaults);
		expect(output.data).toEqual(defaults);
		expect(output.message).toBeUndefined();
		if (testConstraints) expect(output.constraints).toEqual(expectedConstraints);
	});

	it('with incorrect test data', async () => {
		const output = await superValidate(invalidData, adapter());
		expect(output.valid).toEqual(false);
		expect(output.errors).toEqual(expectedErrors);
		expect(output.data).not.toBe(invalidData);
		// Defaults and incorrectData are now merged
		expect(output.data).toEqual(merge(defaults, invalidData));
		expect(output.message).toBeUndefined();
		if (testConstraints) expect(output.constraints).toEqual(expectedConstraints);
	});

	it('with valid test data', async () => {
		const output = await superValidate(validData, adapter());
		expect(output.valid).toEqual(true);
		expect(output.errors).toEqual({});
		expect(output.data).not.toBe(validData);
		expect(output.data).toEqual(validData);
		expect(output.message).toBeUndefined();
		if (testConstraints) expect(output.constraints).toEqual(expectedConstraints);
	});
}

///// Validation libraries ////////////////////////////////////////////////////

describe('Valibot', () => {
	const schema = object({
		name: string(),
		email: string([email()]),
		tags: array(string([minLength(2)]), [minLength(2)])
	});

	const errors = {
		email: 'Invalid email',
		tags: { '0': 'Invalid length' }
	};

	schemaTest(() => valibot(schema, { defaults }), errors, false);
});

///////////////////////////////////////////////////////////////////////////////

describe('ajv', () => {
	const schema: JSONSchema = {
		type: 'object',
		properties: {
			name: { type: 'string' },
			email: { type: 'string', format: 'email' },
			tags: {
				type: 'array',
				minItems: 2,
				items: { type: 'string', minLength: 2 },
				default: ['A'] as string[]
			}
		},
		required: ['name', 'email', 'tags'] as string[],
		additionalProperties: false,
		$schema: 'http://json-schema.org/draft-07/schema#'
	} as const;

	const errors = {
		email: 'must match format "email"',
		tags: { '0': 'must NOT have fewer than 2 characters' }
	};

	schemaTest(() => ajv(schema), errors, true);
});

///////////////////////////////////////////////////////////////////////////////

describe('Zod', () => {
	const schema = z.object({
		name: z.string(),
		email: z.string().email(),
		tags: z.string().min(2).array().min(2).default(['A'])
	});

	it('with defaultValues', () => {
		const values = defaultValues<z.infer<typeof bigZodSchema>>(zodToJsonSchema(bigZodSchema));
		expect(values.foo).toEqual(Foo.A);
	});

	it('with constraints', () => {
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

	schemaTest(() => zod(schema), errors, true);
});
