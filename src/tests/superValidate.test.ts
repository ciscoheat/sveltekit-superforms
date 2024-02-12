import { describe, it, expect, assert, beforeEach } from 'vitest';
import type { ValidationAdapter } from '$lib/adapters/index.js';
import { Foo, bigZodSchema } from './data.js';
import { constraints, type InputConstraints } from '$lib/jsonSchema/constraints.js';
import { defaultValues } from '$lib/jsonSchema/schemaDefaults.js';
import { defaultValues as adapterDefaults } from '$lib/defaults.js';
import {
	withFiles,
	message,
	setError,
	superValidate,
	type SuperValidated
} from '$lib/superValidate.js';
import { merge } from 'ts-deepmerge';
import { fail } from '@sveltejs/kit';
import { defaults as schemaDefaults } from '$lib/defaults.js';

///// Adapters //////////////////////////////////////////////////////

import { zod, zodToJSONSchema } from '$lib/adapters/zod.js';
import { z } from 'zod';

import { valibot } from '$lib/adapters/valibot.js';
import {
	object,
	string,
	email,
	minLength,
	array,
	integer,
	number,
	minValue,
	date,
	optional,
	regex,
	transform
} from 'valibot';

//import { ajv } from '$lib/adapters/ajv.js';
//import type { JSONSchema } from '$lib/jsonSchema/index.js';

import { arktype } from '$lib/adapters/arktype.js';
import { type } from 'arktype';

import { typebox } from '$lib/adapters/typebox.js';
import { Type } from '@sinclair/typebox';

import { joi } from '$lib/adapters/joi.js';
import Joi from 'joi';

import { yup } from '$lib/adapters/yup.js';
import {
	object as yupObject,
	string as yupString,
	number as yupNumber,
	array as yupArray,
	date as yupDate
} from 'yup';
import {vine} from "$lib/adapters/vine.js"
import Vine from "@vinejs/vine"
import { traversePath } from '$lib/traversal.js';
import { splitPath } from '$lib/stringPath.js';

///// Test data /////////////////////////////////////////////////////

/* 
TEST SCHEMA TEMPLATE:

| field   | type     | required | constraints             | default   |
| ------- | -------- | -------- | ----------------------- | --------- |
| name    | string   | no       |                         | "Unknown" |
| email   | string   | yes      | email format            |           |
| tags    | string[] | yes      | array >= 3, string >= 2 |           |
| score   | number   | yes      | integer, >= 0           |           |
| date    | Date     | no       |                         |           |
| nospace | string   | no       | pattern /^\S*$/         |           |
*/

/**
 * Input data to superValidate
 * Should give no errors
 */
const validData = {
	name: 'Ok',
	email: 'test@example.com',
	tags: ['Ok 1', 'Ok 2', 'Ok 3'],
	score: 10,
	date: new Date('2024-01-01'),
	nospace: 'Abc'
};

/**
 * Input data to superValidate
 * Should give error on email, tags and tags[1]
 * Score and date is left out, to see if defaults are added properly.
 */
const invalidData = { name: 'Ok', email: '', tags: ['AB', 'B'], nospace: 'One space' };

/**
 * What should be returned when no data is sent to superValidate
 * Should give error on email and tags
 */
const defaults = {
	name: 'Unknown',
	email: '',
	tags: [] as string[],
	score: 0,
	date: undefined,
	nospace: undefined
};

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
	},
	nospace: {
		pattern: '^\\S*$'
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

const nospacePattern = /^\S*$/;

///// Validation libraries //////////////////////////////////////////

describe('Yup', () => {
	const schema = yupObject({
		name: yupString().default('Unknown'),
		email: yupString().email().required(),
		tags: yupArray().of(yupString().min(2)).min(3).required(),
		score: yupNumber().integer().min(0).required(),
		date: yupDate(),
		nospace: yupString().matches(nospacePattern)
	});

	schemaTest(yup(schema));
});

describe('Joi', () => {
	const schema = Joi.object({
		name: Joi.string().default('Unknown'),
		email: Joi.string().email().required(),
		tags: Joi.array().items(Joi.string().min(2)).min(3).required(),
		score: Joi.number().integer().min(0).required(),
		date: Joi.date(),
		nospace: Joi.string().pattern(nospacePattern)
	});

	schemaTest(joi(schema));
});

describe('TypeBox', () => {
	const schema = Type.Object({
		name: Type.String({ default: 'Unknown' }),
		email: Type.String({ format: 'email' }),
		tags: Type.Array(Type.String({ minLength: 2 }), { minItems: 3 }),
		score: Type.Integer({ minimum: 0 }),
		date: Type.Optional(Type.Date()),
		nospace: Type.Optional(Type.String({ pattern: '^\\S*$' }))
	});

	schemaTest(typebox(schema));
});

/////////////////////////////////////////////////////////////////////

describe('Arktype', () => {
	const schema = type({
		name: 'string',
		email: 'email',
		tags: '(string>=2)[]>=3',
		score: 'integer>=0',
		'date?': 'Date',
		'nospace?': nospacePattern
	});

	const adapter = arktype(schema, { defaults });
	schemaTest(adapter, ['email', 'date', 'nospace', 'tags'], 'simple');
});

/////////////////////////////////////////////////////////////////////

describe('Valibot', () => {
	const schema = object({
		name: optional(string(), 'Unknown'),
		email: string([email()]),
		tags: array(string([minLength(2)]), [minLength(3)]),
		score: number([integer(), minValue(0)]),
		date: optional(date()),
		nospace: optional(string([regex(nospacePattern)]))
	});

	describe('Introspection', () => {
		schemaTest(valibot(schema));
	});

	describe('Defaults', () => {
		schemaTest(valibot(schema, { defaults }), undefined, 'simple');
	});
});

/////////////////////////////////////////////////////////////////////

// ajv is disabled due to no ESM compatibility.
/*
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
			score: { type: 'integer', minimum: 0 },
			date: { type: 'integer', format: 'unix-time' }
		},
		required: ['name', 'email', 'tags', 'score'] as string[],
		additionalProperties: false,
		$schema: 'http://json-schema.org/draft-07/schema#'
	} as const;

	schemaTest(ajv(schema));
});
*/

/////////////////////////////////////////////////////////////////////

describe('Zod', () => {
	const schema = z
		.object({
			name: z.string().default('Unknown'),
			email: z.string().email(),
			tags: z.string().min(2).array().min(3),
			score: z.number().int().min(0),
			date: z.date().optional(),
			nospace: z.string().regex(nospacePattern).optional()
		})
		.refine((a) => a)
		.refine((a) => a)
		.refine((a) => a);

	it('with defaultValues', () => {
		const values = defaultValues<z.infer<typeof bigZodSchema>>(zodToJSONSchema(bigZodSchema));
		expect(values.foo).toEqual(Foo.A);
	});

	it('with constraints', () => {
		const expected = {
			email: { required: true },
			tags: { minlength: 2 },
			set: { required: true },
			reg1: { pattern: '\\D', required: true },
			reg: { pattern: 'X', minlength: 3, maxlength: 30, required: true },
			num: { min: 10, max: 100, step: 5, required: true },
			date: { min: '2022-01-01T00:00:00.000Z', required: true },
			arr: { minlength: 10, required: true },
			nestedTags: { id: { min: 1 }, name: { minlength: 1, required: true } }
		};
		const values = constraints<z.infer<typeof bigZodSchema>>(zodToJSONSchema(bigZodSchema));
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

	it('with catchAll', async () => {
		const schema = z
			.object({
				name: z.string().min(1)
			})
			.catchall(z.number().int());

		const formData = new FormData();
		formData.set('name', 'Test');
		formData.set('score', '1');
		formData.set('stats', 'nope');

		const form = await superValidate(formData, zod(schema));
		assert(!form.valid);
		expect(form.data).toStrictEqual({
			name: 'Test',
			score: 1,
			stats: NaN
		});
		expect(form.errors).toEqual({ stats: ['Expected number, received nan'] });

		formData.set('stats', '2');

		const form2 = await superValidate(formData, zod(schema));
		assert(form2.valid);
		expect(form2.data).toStrictEqual({
			name: 'Test',
			score: 1,
			stats: 2
		});

		const name: string = form2.data.name;
		// @ts-expect-error Testing catchall type
		const notAString: string = form2.data.extra;
		const num: number = form2.data.stats;

		name;
		notAString;
		num;
	});

	schemaTest(zod(schema));
});

/////////////////////////////////////////////////////////////////////

describe("vine", () => {
	const schema = Vine.object(({
		name: Vine.string().parse(v => {v ?? 'Unknown'}).optional(),
		email: Vine.string().email(),
		tags: Vine.array(Vine.string().minLength(2)).minLength(3),
		score: Vine.number().min(0),
		date: Vine.date().optional(),
		noSpace: Vine.string().regex(nospacePattern).optional()
	}))
	const adapter = vine(schema, {defaults})
	schemaTest(adapter, ['email', 'date', 'nospace', 'tags'], 'simple');
})

///// Common ////////////////////////////////////////////////////////

describe('Schema In/Out transformations', () => {
	it('does not fully work with Zod', async () => {
		const schema = z.object({
			len: z
				.string()
				.transform((n) => n.length)
				.refine((n) => n < 100, 'Length can be max 100.')
		});

		// Zod adapter cannot infer Out type as number, but at least the type is ok.
		// @ts-expect-error Using schema Out type as In - Not allowed
		const fail = await superValidate({ len: 123 }, zod(schema));
		expect(fail.valid).toBe(false);
		expect(fail.data).toEqual({ len: '' });
		// Wanted: expect(fail.data).toBe({ len: 0 });

		// Workaround
		// @ts-expect-error Using schema Out type as In - Not allowed
		const fail2 = await superValidate({ len: 123 }, zod(schema, { defaults: { len: 0 } }));
		expect(fail2.valid).toBe(false);
		// Type will pass through, since it's the same as the default.
		expect(fail2.data).toEqual({ len: 123 });

		const form = await superValidate({ len: 'abcde' }, zod(schema));
		expect(form.valid).toBe(true);
		expect(form.data.len).toBe(5);
	});

	it('does not fully work with Valibot', async () => {
		const schema = object({
			len: transform(string(), (s) => s.length)
		});

		// @ts-expect-error Using schema Out type as In - Not allowed
		const fail = await superValidate({ len: 123 }, valibot(schema));
		expect(fail.valid).toBe(false);
		expect(fail.data).toEqual({ len: '' });
		// Wanted: expect(fail.data).toBe({ len: 0 });

		// @ts-expect-error Using schema Out type as In - Not allowed
		const fail2 = await superValidate({ len: 123 }, valibot(schema, { defaults: { len: 0 } }));
		expect(fail2.valid).toBe(false);
		// Type will pass through, since it's the same as the default.
		expect(fail2.data).toEqual({ len: 123 });

		const form = await superValidate({ len: 'abcde' }, valibot(schema));
		const num: number = form.data.len; // Type check
		expect(form.valid).toBe(true);
		expect(num).toBe(5);
	});
});

///// Test function for all validation libraries ////////////////////

type ErrorFields = ('email' | 'date' | 'nospace' | 'tags' | 'tags[1]')[];

function schemaTest(
	adapter: ValidationAdapter<Record<string, unknown>, Record<string, unknown>>,
	errors: ErrorFields = ['email', 'nospace', 'tags', 'tags[1]'],
	adapterType: 'full' | 'simple' = 'full'
) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function expectErrors(errors: ErrorFields, errorMessages: Record<string, any>) {
		//console.log('🚀 ~ expectErrors ~ errorMessages:', errorMessages);

		if (errors.includes('nospace')) expect(errorMessages.nospace).toBeTruthy();
		if (errors.includes('email')) expect(errorMessages.email).toBeTruthy();
		if (errors.includes('date')) expect(errorMessages.date).toBeTruthy();
		if (errors.includes('tags')) expect(errorMessages?.tags?._errors?.[0]).toBeTruthy();
		if (errors.includes('tags[1]')) expect(errorMessages?.tags?.['1']?.[0]).toBeTruthy();

		const errorCount = errors.filter((path) => traversePath(errorMessages, splitPath(path))?.value);

		expect(errors).toEqual(errorCount);
	}

	function expectConstraints(inputConstraints?: InputConstraints<Record<string, unknown>>) {
		switch (adapterType) {
			case 'simple':
				expect(inputConstraints).toEqual(simpleConstraints);
				break;
			case 'full':
				expect(inputConstraints).toEqual(fullConstraints);
				break;
		}
	}

	function mergeDefaults(invalidData: Record<string, unknown>) {
		// undefined fields should not be added to invalidData.
		const filteredDefaults = Object.fromEntries(
			Object.entries(defaults).filter(([, value]) => value !== undefined)
		);
		return merge(filteredDefaults, invalidData);
	}

	it('with schema only', async () => {
		const output = await superValidate(adapter);
		expect(output.errors).toEqual({});
		expect(output.valid).toEqual(false);
		expect(output.data).not.toBe(defaults);
		expect(output.data).toEqual(defaults);
		expect(output.message).toBeUndefined();
		expectConstraints(output.constraints);
	});

	it('with schema only and initial errors', async () => {
		const output = await superValidate(adapter, { errors: true });
		// Expect default value errors, which means that tags[1] should not exist,
		// the error is only for the array length.
		expectErrors(['email', 'tags'], output.errors);
		expect(output.valid).toEqual(false);
		expect(output.data).not.toBe(defaults);
		expect(output.data).toEqual(defaults);
		expect(output.message).toBeUndefined();
		expectConstraints(output.constraints);
	});

	it('with invalid test data', async () => {
		const output = await superValidate(invalidData, adapter);
		expectErrors(errors, output.errors);
		expect(output.valid).toEqual(false);
		expect(output.data).not.toBe(invalidData);

		expect(output.data).toEqual(mergeDefaults(invalidData));
		expect(output.message).toBeUndefined();
		expectConstraints(output.constraints);
	});

	it('with valid test data', async () => {
		const output = await superValidate(validData, adapter);
		expect(output.errors).toEqual({});
		expect(output.valid).toEqual(true);
		expect(output.data).not.toBe(validData);
		expect(output.data).toEqual(validData);
		expect(output.message).toBeUndefined();
		expectConstraints(output.constraints);
	});

	describe('defaults', () => {
		it('should return default values with schema only', () => {
			const output = schemaDefaults(adapter);
			expect(output.errors).toEqual({});
			expect(output.valid).toEqual(false);
			expect(output.data).not.toBe(defaults);
			expect(output.data).toEqual(defaults);
			expect(output.message).toBeUndefined();
			expectConstraints(output.constraints);
		});

		it('should merge partial data with adapter defaults', () => {
			const output = schemaDefaults({ name: 'Sync' }, adapter);
			expect(output.errors).toEqual({});
			expect(output.valid).toEqual(false);
			expect(output.data).toEqual(mergeDefaults({ name: 'Sync' }));
			expect(output.message).toBeUndefined();
			expectConstraints(output.constraints);
		});
	});
}

describe('File handling with the allowFiles option', () => {
	const schema = z.object({
		avatar: z.custom<File>().refine((f) => {
			return f instanceof File && f.size <= 1000;
		}, 'Max 1Kb upload size.')
	});

	it('should define the file field as undefined', () => {
		expect(adapterDefaults(zod(schema))).toEqual({
			avatar: undefined
		});
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
			fail(400, withFiles({ form }));
			expect(form.data.avatar).toBeUndefined();
		});
	});
});

describe('Edge cases', () => {
	describe('Normal boolean', () => {
		const schema = z.object({
			active: z.boolean()
		});

		async function testBool(value: string, expected: boolean | undefined) {
			const formData = new FormData();
			formData.set('active', value);

			const form = await superValidate(formData, zod(schema));
			expect(form.data.active).toBe(expected);
		}

		it('Should parse an empty string to false', async () => {
			testBool('', false);
		});

		it('Should parse "false" to false', async () => {
			testBool('false', false);
		});

		it('Should parse "true" to true', async () => {
			testBool('true', true);
		});

		it('Should parse any other value to true', async () => {
			testBool('ok', true);
			testBool('1', true);
		});
	});

	describe('Boolean with default value true', () => {
		const schema = z.object({
			active: z.boolean().default(true)
		});

		function testBool(value: string, expected: boolean | undefined) {
			return async () => {
				const formData = new FormData();
				formData.set('active', value);

				const form = await superValidate(formData, zod(schema));
				expect(form.data.active).toBe(expected);
			};
		}

		it('Should parse an empty string to false', testBool('', false));
		it('Should parse "false" to false', testBool('false', false));
		it('Should parse "true" to true', testBool('true', true));
		it('Should parse any other value to true', testBool('ok', true));
		it('Should parse any other value to true', testBool('1', true));
	});

	describe('Tri-state boolean', () => {
		const schema = z.object({
			active: z.boolean().optional()
		});

		async function testBool(value: string, expected: boolean | undefined) {
			const formData = new FormData();
			formData.set('active', value);

			const form = await superValidate(formData, zod(schema));
			expect(form.data.active).toBe(expected);
		}

		it('Should parse an empty string to undefined', async () => {
			testBool('', undefined);
		});

		it('Should parse "false" to false', async () => {
			testBool('false', false);
		});

		it('Should parse "true" to true', async () => {
			testBool('true', true);
		});

		it('Should parse any other value to true', async () => {
			testBool('ok', true);
			testBool('1', true);
		});
	});

	describe('Union with same type', () => {
		const schema = z.object({
			interval: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal(15)]).default(1)
		});

		it('should work with FormData', async () => {
			const formData = new FormData();
			formData.set('interval', '5');

			const form = await superValidate(formData, zod(schema));
			expect(form.data.interval).toBe(5);
		});

		it('should have a default value', async () => {
			const defaults = defaultValues<z.infer<typeof schema>>(zod(schema).jsonSchema);
			expect(defaults.interval).toBe(1);
		});
	});
});
