import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { describe, it, expect } from 'vitest';
import { toJsonSchema, type ValidationAdapter } from '$lib/adapters/index.js';
import { Foo, bigZodSchema } from './data.js';
import { constraints } from '$lib/jsonSchema/constraints.js';
import { defaultValues } from '$lib/jsonSchema/defaultValues.js';
import { superValidate } from '$lib/superValidate.js';
import merge from 'ts-deepmerge';

///// Adapters //////////////////////////////////////////////////////

import { zod, zodToJsonSchema } from '$lib/adapters/zod.js';
import { z } from 'zod';

import { valibot } from '$lib/adapters/valibot.js';
import { object, string, email, minLength, array } from 'valibot';

import { ajv } from '$lib/adapters/ajv.js';

import { arktype } from '$lib/adapters/arktype.js';
import { type } from 'arktype';

import { typebox } from '$lib/adapters/typebox.js';
import { Type } from '@sinclair/typebox';
import { schemaShape } from '$lib/jsonSchema/schemaShape.js';
//import { TypeCompiler } from '@sinclair/typebox/compiler';

///// Test data /////////////////////////////////////////////////////

/* 
TEST SCHEMA TEMPLATE:
{
	name: string, length >= 2
	email: string, email format
	tags: string array, array length >= 3, string length >= 2
	score: integer, >= 0
}
*/

/**
 * Input data to superValidate
 * Should give no errors
 */
const validData = {
	name: 'Ok',
	email: 'test@example.com',
	tags: ['Ok 1', 'Ok 2', 'Ok 3'],
	score: 10
};

/**
 * Input data to superValidate
 * Should give error on email, tags, tags[1] and score
 * Score is left out, to see if defaults are added properly.
 */
const invalidData = { name: 'Ok', email: '', tags: ['AB', 'B'] };

/**
 * What should be returned when no data is sent to superValidate
 */
const defaults = { name: '', email: '', tags: [], score: 0 };

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
	score: {
		min: 0,
		required: true
	},
	tags: {
		required: true,
		minlength: 2
	}
};

///// Validation libraries //////////////////////////////////////////

describe('TypeBox', () => {
	const schema = Type.Object({
		name: Type.String(),
		email: Type.String({ format: 'email' }),
		tags: Type.Array(Type.String({ minLength: 2 }), { minItems: 3 }),
		score: Type.Integer({ minimum: 0 })
	});

	//console.dir(schema, { depth: 10 }); //debug
	//const compiled = TypeCompiler.Compile(schema);
	//const errors2 = [...compiled.Errors(invalidData)];
	//console.dir(errors2, { depth: 10 }); //debug

	const errors = {
		name: 'Expected string length greater or equal to 2',
		email: "Expected string to match 'email' format",
		tags: 'Expected array length to be greater or equal to 3',
		tags1: 'Expected string length greater or equal to 2'
	};

	schemaTest(() => typebox(schema), errors, true);
});

/////////////////////////////////////////////////////////////////////

describe('Arktype', () => {
	const schema = type({
		name: 'string',
		email: 'email',
		tags: '(string>=2)[]>=2'
	});

	const errors = {
		email: "email must be a valid email (was '')",
		//tags: 'tags must be at least 2 characters (was 0)',
		tags1: 'tags/1 must be at least 2 characters (was 1)'
	};

	schemaTest(() => arktype(schema, { defaults }), errors, false);
});

/////////////////////////////////////////////////////////////////////

/*
describe('Valibot', () => {
	const schema = object({
		name: string(),
		email: string([email()]),
		tags: array(string([minLength(2)]), [minLength(2)])
	});

	const errors = {
		email: 'Invalid email',
		tags: 'Invalid length',
		tags0: 'Invalid length'
	};

	schemaTest(() => valibot(schema, { defaults }), errors, false);
});

/////////////////////////////////////////////////////////////////////

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
		tags: 'must NOT have fewer than 2 items',
		tags0: 'must NOT have fewer than 2 characters'
	};

	schemaTest(() => ajv(schema), errors, true);
});

/////////////////////////////////////////////////////////////////////

describe('Zod', () => {
	const schema = z
		.object({
			name: z.string(),
			email: z.string().email(),
			tags: z.string().min(2).array().min(3),
			score: z.number().int().min(0)
		})
		.refine((a) => a)
		.refine((a) => a)
		.refine((a) => a);

	it('with defaultValues', () => {
		const values = defaultValues<z.infer<typeof bigZodSchema>>(zodToJsonSchema(bigZodSchema));
		expect(values.foo).toEqual(Foo.A);
	});

	it('with constraints', () => {
		const expected = {
			email: { required: true },
			tags: { minlength: 2 },
			foo: { required: true },
			set: { required: true },
			reg1: { pattern: '\\D', required: true },
			reg: { pattern: 'X', minlength: 3, maxlength: 30, required: true },
			num: { min: 10, max: 100, step: 5, required: true },
			date: { min: '2022-01-01T00:00:00.000Z', required: true },
			arr: { minlength: 10, required: true },
			nestedTags: { id: { min: 1 }, name: { minlength: 1, required: true } }
		};
		const values = constraints<z.infer<typeof bigZodSchema>>(zodToJsonSchema(bigZodSchema));
		expect(values).toEqual(expected);
	});

	const errors = {
		email: 'Invalid email',
		tags: 'Array must contain at least 3 element(s)',
		tags1: 'String must contain at least 2 character(s)'
	};

	schemaTest(() => zod(schema), errors, true);
});
*/

///// Test function for all validation libraries ////////////////////

function schemaTest(
	adapter: () => ValidationAdapter<Record<string, unknown>>,
	errors: { email: string; tags?: string; tags1?: string },
	testConstraints: boolean
) {
	function expectedErrors(addTag1 = true) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const output: Record<string, any> = {
			email: [errors.email]
		};

		if (addTag1 && errors.tags1) output.tags = { '1': [errors.tags1] };
		if (errors.tags) {
			if (!output.tags) output.tags = {};
			output.tags._errors = [errors.tags];
		}
		return output;
	}

	it('with schema only', async () => {
		const output = await superValidate(adapter());
		expect(output.errors).toEqual({});
		expect(output.valid).toEqual(false);
		expect(output.data).not.toBe(defaults);
		expect(output.data).toEqual(defaults);
		expect(output.message).toBeUndefined();
		if (testConstraints) expect(output.constraints).toEqual(expectedConstraints);
	});

	it('with schema only and initial errors', async () => {
		const output = await superValidate(adapter(), { errors: true });
		const errors = expectedErrors(false);

		expect(output.errors).toEqual(errors);
		expect(output.valid).toEqual(false);
		expect(output.data).not.toBe(defaults);
		expect(output.data).toEqual(defaults);
		expect(output.message).toBeUndefined();
		if (testConstraints) expect(output.constraints).toEqual(expectedConstraints);
	});

	it('with incorrect test data', async () => {
		const output = await superValidate(invalidData, adapter());
		expect(output.errors).toEqual(expectedErrors());
		expect(output.valid).toEqual(false);
		expect(output.data).not.toBe(invalidData);
		// Defaults and incorrectData are now merged
		expect(output.data).toEqual(merge(defaults, invalidData));
		expect(output.message).toBeUndefined();
		if (testConstraints) expect(output.constraints).toEqual(expectedConstraints);
	});

	it('with valid test data', async () => {
		const output = await superValidate(validData, adapter());
		expect(output.errors).toEqual({});
		expect(output.valid).toEqual(true);
		expect(output.data).not.toBe(validData);
		expect(output.data).toEqual(validData);
		expect(output.message).toBeUndefined();
		if (testConstraints) expect(output.constraints).toEqual(expectedConstraints);
	});
}
