import type { JSONSchema } from '$lib/jsonSchema/index.js';
import { describe, it, expect, assert, beforeEach } from 'vitest';
import { type ValidationAdapter } from '$lib/adapters/index.js';
import { Foo, bigZodSchema } from './data.js';
import { constraints, type InputConstraints } from '$lib/jsonSchema/constraints.js';
import { defaultValues } from '$lib/jsonSchema/defaultValues.js';
import {
	removeFiles,
	message,
	setError,
	superValidate,
	type SuperValidated,
	failAndRemoveFiles
} from '$lib/superValidate.js';
import merge from 'ts-deepmerge';

///// Adapters //////////////////////////////////////////////////////

import { zod, zodToJsonSchema } from '$lib/adapters/zod.js';
import { z } from 'zod';

import { valibot } from '$lib/adapters/valibot.js';
import { object, string, email, minLength, array, integer, number, minValue } from 'valibot';

import { ajv } from '$lib/adapters/ajv.js';

import { arktype } from '$lib/adapters/arktype.js';
import { type } from 'arktype';

import { typebox } from '$lib/adapters/typebox.js';
import { Type } from '@sinclair/typebox';

import { joi } from '$lib/adapters/joi.js';
import Joi from 'joi';

import { superform, type Validators } from '$lib/adapters/superform.js';
import { defaults as schemaDefaults } from '$lib/defaults.js';
import { fail } from '@sveltejs/kit';

///// Test data /////////////////////////////////////////////////////

/* 
TEST SCHEMA TEMPLATE:
{
	name: string, length >= 2, default value "Unknown"
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
 * Should give error on email, tags and tags[1]
 * Score is left out, to see if defaults are added properly.
 */
const invalidData = { name: 'Ok', email: '', tags: ['AB', 'B'] };

/**
 * What should be returned when no data is sent to superValidate
 * Should give error on email and tags
 */
const defaults = { name: 'Unknown', email: '', tags: [] as string[], score: 0 };

/**
 * Expected constraints for libraries with introspection
 */
const fullConstraints = {
	email: {
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

/**
 * Expected constraints for libraries with default values, no introspection
 */
const simpleConstraints = {
	email: {
		required: true
	},
	score: {
		required: true
	},
	tags: {
		required: true
	}
};

///// Validation libraries //////////////////////////////////////////

describe('Superform', () => {
	const schema: Validators<typeof validData> = {
		name: (name) => (!name || name.length < 2 ? '"name" is too short' : null),
		email: (email) => (!email || !email.includes('@') ? 'Email is invalid' : null),
		tags: (tag) => {
			if (!tag || tag.length < 2) return 'Tag must contain at least 2 characters';
		},
		score: (score) => {
			if (isNaN(parseInt(String(score)))) return '"score" must be an integer above or equal to 0';
		}
	};

	const errors = {
		email: 'Email is invalid',
		tags1: 'Tag must contain at least 2 characters'
	};

	schemaTest(() => superform(schema, { defaults }), errors, 'none');
});

describe('Joi', () => {
	const schema = Joi.object({
		name: Joi.string().default('Unknown'),
		email: Joi.string().email().required(),
		tags: Joi.array().items(Joi.string().min(2)).min(3).required(),
		score: Joi.number().integer().min(0).required()
	});

	const errors = {
		email: '"email" is not allowed to be empty',
		tags: '"tags" must contain at least 3 items',
		tags1: '"tags[1]" length must be at least 2 characters'
	};

	schemaTest(() => joi(schema), errors);
});

describe('TypeBox', () => {
	const schema = Type.Object({
		name: Type.String({ default: 'Unknown' }),
		email: Type.String({ format: 'email' }),
		tags: Type.Array(Type.String({ minLength: 2 }), { minItems: 3 }),
		score: Type.Integer({ minimum: 0 })
	});

	const errors = {
		email: "Expected string to match 'email' format",
		tags: 'Expected array length to be greater or equal to 3',
		tags1: 'Expected string length greater or equal to 2'
	};

	schemaTest(() => typebox(schema), errors);
});

/////////////////////////////////////////////////////////////////////

describe('Arktype', () => {
	const schema = type({
		name: 'string',
		email: 'email',
		tags: '(string>=2)[]>=3',
		score: 'integer>=0'
	});

	const errors = {
		email: "email must be a valid email (was '')",
		tags: /tags must be at least 3 characters \(was [02]\)/
		//tags1: 'tags/1 must be at least 2 characters (was 1)'
	};

	schemaTest(() => arktype(schema, { defaults }), errors, 'simple');
});

/////////////////////////////////////////////////////////////////////

describe('Valibot', () => {
	const schema = object({
		name: string(),
		email: string([email()]),
		tags: array(string([minLength(2)]), [minLength(3)]),
		score: number([integer(), minValue(0)])
	});

	const errors = {
		email: 'Invalid email',
		tags: 'Invalid length',
		tags1: 'Invalid length'
	};

	schemaTest(() => valibot(schema, { defaults }), errors, 'simple');
});

/////////////////////////////////////////////////////////////////////

describe('ajv', () => {
	const schema: JSONSchema = {
		type: 'object',
		properties: {
			name: { type: 'string', default: 'Unknown' },
			email: { type: 'string', format: 'email' },
			tags: {
				type: 'array',
				minItems: 3,
				items: { type: 'string', minLength: 2 }
			},
			score: { type: 'integer', minimum: 0 }
		},
		required: ['name', 'email', 'tags', 'score'] as string[],
		additionalProperties: false,
		$schema: 'http://json-schema.org/draft-07/schema#'
	} as const;

	const errors = {
		email: 'must match format "email"',
		tags: 'must NOT have fewer than 3 items',
		tags1: 'must NOT have fewer than 2 characters'
	};

	schemaTest(() => ajv(schema), errors);
});

/////////////////////////////////////////////////////////////////////

describe('Zod', () => {
	const schema = z
		.object({
			name: z.string().default('Unknown'),
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

	it('with form-level errors', async () => {
		const schema = z
			.object({
				name: z.string()
			})
			.refine((a) => a.name == 'OK', {
				message: 'Name is not OK'
			});

		const form = await superValidate({ name: 'Test' }, zod(schema));

		expect(form.errors).toEqual({
			_errors: ['Name is not OK']
		});
	});

	const errors = {
		email: 'Invalid email',
		tags: 'Array must contain at least 3 element(s)',
		tags1: 'String must contain at least 2 character(s)'
	};

	schemaTest(() => zod(schema), errors);
});

///// Test function for all validation libraries ////////////////////

function schemaTest(
	adapter: () => ValidationAdapter<Record<string, unknown>>,
	errors: { email: string | RegExp; tags?: string | RegExp; tags1?: string | RegExp },
	constraints: 'full' | 'simple' | 'none' = 'full'
) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function expectErrors(errorMessages: Record<string, any>, hasTagContentErrors = true) {
		expect(errorMessages.email).toMatch(errors.email);

		if (errors.tags) {
			expect(errorMessages?.tags?._errors?.[0] ?? '').toMatch(errors.tags);
		}

		if (hasTagContentErrors && errors.tags1) {
			expect(errorMessages?.tags?.['1']?.[0] ?? '').toMatch(errors.tags1);
		}
	}

	function expectConstraints(inputConstraints: InputConstraints<Record<string, unknown>>) {
		switch (constraints) {
			case 'simple':
				expect(inputConstraints).toEqual(simpleConstraints);
				break;
			case 'full':
				expect(inputConstraints).toEqual(fullConstraints);
				break;
		}
	}

	it('with schema only', async () => {
		const output = await superValidate(adapter());
		expect(output.errors).toEqual({});
		expect(output.valid).toEqual(false);
		expect(output.data).not.toBe(defaults);
		expect(output.data).toEqual(defaults);
		expect(output.message).toBeUndefined();
		expectConstraints(output.constraints);
	});

	it('with schema only and initial errors', async () => {
		const output = await superValidate(adapter(), { errors: true });
		// Expect default value errors, which means that tags[1] should not exist,
		// the error is only for the array length.
		expectErrors(output.errors, false);
		expect(output.valid).toEqual(false);
		expect(output.data).not.toBe(defaults);
		expect(output.data).toEqual(defaults);
		expect(output.message).toBeUndefined();
		expectConstraints(output.constraints);
	});

	it('with invalid test data', async () => {
		const output = await superValidate(invalidData, adapter());
		expectErrors(output.errors);
		expect(output.valid).toEqual(false);
		expect(output.data).not.toBe(invalidData);
		// Defaults and incorrectData are now merged
		expect(output.data).toEqual(merge(defaults, invalidData));
		expect(output.message).toBeUndefined();
		expectConstraints(output.constraints);
	});

	it('with valid test data', async () => {
		const output = await superValidate(validData, adapter());
		expect(output.errors).toEqual({});
		expect(output.valid).toEqual(true);
		expect(output.data).not.toBe(validData);
		expect(output.data).toEqual(validData);
		expect(output.message).toBeUndefined();
		expectConstraints(output.constraints);
	});

	describe('defaults', () => {
		it('should return default values with schema only', () => {
			const output = schemaDefaults(adapter());
			expect(output.errors).toEqual({});
			expect(output.valid).toEqual(false);
			expect(output.data).not.toBe(defaults);
			expect(output.data).toEqual(defaults);
			expect(output.message).toBeUndefined();
			expectConstraints(output.constraints);
		});

		it('should merge partial data with adapter defaults', () => {
			const output = schemaDefaults({ name: 'Sync' }, adapter());
			expect(output.errors).toEqual({});
			expect(output.valid).toEqual(false);
			expect(output.data).toEqual({ ...defaults, name: 'Sync' });
			expect(output.message).toBeUndefined();
			expectConstraints(output.constraints);
		});
	});
}

///// File handling /////////////////////////////////////////////////

describe('File handling with the allowFiles option', () => {
	const schema = z.object({
		avatar: z.custom<File>().refine((f) => {
			return f && f.size <= 1000;
		}, 'Max 1Kb upload size.')
	});

	it('should allow files if specified as an option', async () => {
		const formData = new FormData();
		formData.set('avatar', new Blob(['A'.repeat(100)]));

		const output = await superValidate(formData, zod(schema), { allowFiles: true });
		assert(output.data.avatar instanceof File);
		expect(output.data.avatar.size).toBe(100);
		expect(output.valid).toBe(true);
	});

	it('should fail by testing the schema', async () => {
		const formData = new FormData();
		formData.set('avatar', new Blob(['A'.repeat(1001)]));

		const output = await superValidate(formData, zod(schema), { allowFiles: true });
		assert(output.data.avatar instanceof File);
		expect(output.valid).toBe(false);
		expect(output.errors.avatar).toEqual(['Max 1Kb upload size.']);
	});

	describe('File removal from the superValidate object', () => {
		let form: SuperValidated<z.infer<typeof schema>>;

		beforeEach(async () => {
			const formData = new FormData();
			formData.set('avatar', new Blob(['A'.repeat(100)]));
			form = await superValidate(formData, zod(schema), { allowFiles: true });
			expect(form.data.avatar).toBeInstanceOf(File);
		});

		it('should remove the files with setError', async () => {
			setError(form, 'avatar', 'Setting error');
			expect(form.data.avatar).toBeUndefined();
			expect(form.errors.avatar).toEqual(['Setting error']);
		});

		it('should remove the files with message and a valid file', async () => {
			expect(form.data.avatar).toBeInstanceOf(File);
			expect(form.valid).toBe(true);
			message(form, 'Message');
			expect(form.data.avatar).toBeUndefined();
			expect(form.message).toEqual('Message');
		});

		it('should remove the files with message and an invalid file', async () => {
			const formData = new FormData();
			formData.set('avatar', new Blob(['A'.repeat(1001)]));
			form = await superValidate(formData, zod(schema), { allowFiles: true });
			expect(form.data.avatar).toBeInstanceOf(File);
			expect(form.valid).toBe(false);

			message(form, 'Message');
			expect(form.data.avatar).toBeUndefined();
			expect(form.message).toEqual('Message');
		});

		it('should remove the files with the removeFiles function', async () => {
			fail(400, removeFiles({ form }));
			expect(form.data.avatar).toBeUndefined();
		});

		it('should remove the files with the failAndRemoveFiles function', async () => {
			failAndRemoveFiles(400, removeFiles({ form }));
			expect(form.data.avatar).toBeUndefined();
		});
	});
});
