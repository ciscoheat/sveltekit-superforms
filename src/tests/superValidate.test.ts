import { describe, it, expect, assert, beforeEach } from 'vitest';
import type { Infer, InferIn, ValidationAdapter } from '$lib/adapters/index.js';
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
import { fail as kitFail } from '@sveltejs/kit';
import { defaults as schemaDefaults } from '$lib/defaults.js';

///// Adapters //////////////////////////////////////////////////////

import { zod, zodToJSONSchema } from '$lib/adapters/zod.js';
import { z, type ZodErrorMap } from 'zod';

import { valibot } from '$lib/adapters/valibot.js';
import * as v from 'valibot';

import { classvalidator } from '$lib/adapters/classvalidator.js';
import {
	ArrayMinSize,
	IsOptional,
	IsString,
	IsEmail,
	IsArray,
	MinLength,
	IsInt,
	Min,
	IsDate,
	Matches
} from 'class-validator';

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

import { vine } from '$lib/adapters/vine.js';
import Vine from '@vinejs/vine';

import { superstruct } from '$lib/adapters/superstruct.js';
import {
	object as ssObject,
	string as ssString,
	number as ssNumber,
	array as ssArray,
	date as ssDate,
	optional as ssOptional,
	define as ssDefine,
	size as ssSize,
	min as ssMin,
	pattern as ssPattern,
	nullable as ssNullable
} from 'superstruct';

import { schemasafe } from '$lib/adapters/schemasafe.js';

import { effect } from '$lib/adapters/effect.js';
import { Schema } from 'effect';

import { traversePath } from '$lib/traversal.js';
import { splitPath } from '$lib/stringPath.js';
import { SchemaError, type JSONSchema } from '$lib/index.js';

///// Test data /////////////////////////////////////////////////////

/*
TEST SCHEMA TEMPLATE:

| field   | type     | opt/null | constraints             | default   |
| ------- | -------- | -------- | ----------------------- | --------- |
| name    | string   | opt      |                         | "Unknown" |
| email   | string   | yes      | email format            |           |
| tags    | string[] | yes      | array >= 3, string >= 2 |           |
| score   | number   | yes      | integer, >= 0           |           |
| date    | Date     | opt      |                         |           |
| nospace | string   | opt      | pattern /^\S*$/         |           |
| extra   | string   | null     |                         |           |
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
	nospace: 'Abc',
	extra: null
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
	date: undefined as Date | undefined,
	nospace: undefined as string | undefined,
	extra: null as string | null
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
		nospace: yupString().matches(nospacePattern),
		extra: yupString().nullable()
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
		nospace: Joi.string().pattern(nospacePattern),
		extra: Joi.string().allow(null)
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
		nospace: Type.Optional(Type.String({ pattern: '^\\S*$' })),
		extra: Type.Union([Type.String(), Type.Null()])
	});

	schemaTest(typebox(schema));
});

describe('Schemasafe', () => {
	const constSchema = {
		$id: 'https://example.com/user-data',
		$schema: 'http://json-schema.org/draft-07/schema',
		type: 'object',
		properties: {
			name: { type: 'string', default: 'Unknown' },
			email: {
				type: 'string',
				format: 'email'
			},
			tags: {
				type: 'array',
				minItems: 3,
				items: { type: 'string', minLength: 2 }
			},
			score: { type: 'integer', minimum: 0 },
			date: { type: 'string', format: 'date' },
			nospace: {
				pattern: '^\\S*$',
				type: 'string'
			},
			extra: {
				anyOf: [
					{
						type: 'string'
					},
					{
						type: 'null'
					}
				]
			}
		},
		required: ['name', 'email', 'tags', 'score', 'extra'],
		additionalProperties: false
	} as const;

	const schema = {
		$id: 'https://example.com/user-data',
		$schema: 'http://json-schema.org/draft-07/schema',
		type: 'object',
		properties: {
			name: { type: 'string', default: 'Unknown' },
			email: {
				type: 'string',
				format: 'email'
			},
			tags: {
				type: 'array',
				minItems: 3,
				items: { type: 'string', minLength: 2 }
			},
			score: { type: 'integer', minimum: 0 },
			date: { type: 'string', format: 'date' },
			nospace: {
				pattern: '^\\S*$',
				type: 'string'
			},
			extra: {
				anyOf: [
					{
						type: 'string'
					},
					{
						type: 'null'
					}
				]
			}
		},
		required: ['name', 'email', 'tags', 'score', 'extra'],
		additionalProperties: false
	};

	// Type test
	const constAdapter = schemasafe(constSchema);
	const a: number = constAdapter.defaults.score;
	a;

	const adapter = schemasafe(schema, { defaults });
	const b: number = adapter.defaults.score;
	b;

	const dynamicAdapter = schemasafe(schema);
	const c: Record<string, unknown> = dynamicAdapter.defaults;
	c;

	schemaTest(constAdapter, undefined, 'full', 'string');
	schemaTest(adapter, undefined, 'full', 'string');
	schemaTest(dynamicAdapter, undefined, 'full', 'string');

	it('should work with type inference for superValidate with a request', async () => {
		const schema = {
			type: 'object',
			properties: {
				name: { type: 'string', default: 'Hello world!' },
				email: { type: 'string', format: 'email' }
			},
			required: ['email'],
			additionalProperties: false,
			$schema: 'http://json-schema.org/draft-07/schema#'
		} as const satisfies JSONSchema;

		const formData = new FormData();
		formData.set('name', 'Test');
		formData.set('email', 'test');

		const request = new Request('https://example.com', {
			method: 'POST',
			body: formData
		});

		//const data = await request.formData();
		//console.log('🚀 ~ it ~ data:', data);

		const adapter = schemasafe(schema);
		const form = await superValidate(request, adapter);
		const email: string = form.data.email;

		assert(!form.valid);
		expect(email).toBe('test');
	});
});

/////////////////////////////////////////////////////////////////////

describe('Arktype', () => {
	const schema = type({
		name: 'string',
		email: 'string.email',
		tags: '(string>=2)[]>=3',
		score: 'number.integer>=0',
		'date?': 'Date',
		'nospace?': nospacePattern,
		extra: 'string|null'
	});

	const adapter = arktype(schema, { defaults });
	schemaTest(adapter, ['email', 'date', 'nospace', 'tags'], 'simple');
});

/////////////////////////////////////////////////////////////////////

describe('Valibot', () => {
	const schema = v.object({
		name: v.optional(v.string(), 'Unknown'),
		email: v.pipe(v.string(), v.email()),
		tags: v.pipe(v.array(v.pipe(v.string(), v.minLength(2))), v.minLength(3)),
		score: v.pipe(v.number(), v.integer(), v.minValue(0)),
		date: v.optional(v.date()),
		nospace: v.optional(v.pipe(v.string(), v.regex(nospacePattern))),
		extra: v.nullable(v.string())
	});

	describe('Introspection', () => {
		schemaTest(valibot(schema));
		//console.dir(valibot(schema).jsonSchema, { depth: 10 });
	});

	describe('Defaults', () => {
		schemaTest(valibot(schema, { defaults }), undefined);
	});

	it('should work with the config options', async () => {
		const adapter = valibot(schema, { config: { abortEarly: true } });
		const form = await superValidate({ email: 'no-email', score: -100 }, adapter);
		assert(!form.valid);
		expect(Object.keys(form.errors).length).toBe(1);
		expect(form.errors?.email?.[0]).toMatch(/^Invalid email/);
	});

	it('should produce a required enum if no default', () => {
		const schema = v.object({
			enum: v.picklist(['a', 'b', 'c']),
			enumDef: v.optional(v.picklist(['a', 'b', 'c']), 'b')
		});

		const adapter = valibot(schema);
		expect(adapter.jsonSchema.required).toEqual(['enum']);
		expect(adapter.defaults).toEqual({
			enum: 'a',
			enumDef: 'b'
		});

		// Change defaults
		adapter.defaults.enum = '' as 'a';

		const a2 = valibot(schema);
		expect(a2.defaults.enum).toBe('');
	});

	it('should handle non-JSON Schema validators by returning any', async () => {
		const schema = v.object({
			file: v.pipe(
				v.instance(File),
				v.mimeType(['image/jpeg', 'image/png']),
				v.maxSize(1024 * 1024 * 10)
			),
			size: v.custom<`${number}px`>((val) =>
				typeof val === 'string' ? /^\d+px$/.test(val) : false
			)
		});

		const photoSchema = v.object({
			photo: v.pipe(
				v.file('Please select an image file.'),
				v.mimeType(
					['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
					'Please select a JPEG, PNG, WEBP, or GIF file.'
				),
				v.maxSize(1024 * 1024 * 10, 'Please select a file smaller than 10MB.')
			)
		});

		expect(() => valibot(schema)).not.toThrow();
		expect(() => valibot(photoSchema)).not.toThrow();

		expect(() =>
			valibot(schema, {
				customSchemaConversion: {
					custom: () => ({}),
					instance: () => ({}),
					file: () => ({}),
					blob: () => ({})
				}
			})
		).not.toThrow();
	});

	/*
	it('should work with FormPathLeaves and brand', async () => {
		const schema = v.object({ id: v.brand(v.string(), 'Id') });
		type T = Infer<typeof schema>;
		type IdSchema = { id: string & v.Brand<"Id"> };
		//     ^? { id: string & Brand<"Id"> }

		const a: FormPathLeaves<T> = 'id';
		// @ts-expect-error Should handle brand
		const b: FormPathLeaves<T> = 'id.length';
		a;
		b;
	});
	*/

	/* 	it('should have the correct Input and Output types', () => {
		const logSchema = v.object({
			id: v.nullish(v.string(), ''),
			name: v.string([v.minLength(1)]),
			date: v.date(), // This is type Date in the inferred type
			characterId: v.optional(v.string(), ''),
			type: v.optional(v.union([v.literal('game'), v.literal('nongame')]), 'game'),
			experience: v.number([v.integer(), v.minValue(0)]),
			acp: v.number([v.integer(), v.minValue(0)]),
			gold: v.number(),
			dtd: v.number([v.integer()]),
			dm: v.object({
				name: v.optional(v.string(), '')
			}),
			is_dm_log: v.optional(v.boolean(), false),
			magic_items_lost: v.optional(v.array(v.string([v.minLength(1)])), [])
		});

		type Out = Infer<typeof logSchema>;
		type In = InferIn<typeof logSchema>;
	});
 */
});

describe('class-validator', () => {
	class ClassValidatorSchema {
		@IsString()
		name: string = 'Unknown';

		@IsString()
		@IsEmail()
		email: string | undefined;

		@IsArray()
		@MinLength(2, { each: true })
		@ArrayMinSize(3)
		tags: string[] | undefined;

		@IsInt()
		@Min(0)
		score: number | undefined;

		@IsDate()
		date: Date | undefined;

		@IsOptional()
		@Matches(/^\S*$/, { message: 'No spaces allowed' })
		nospace: string | undefined;

		@IsOptional()
		@IsString()
		extra: string | null = null;
	}

	const adapter = classvalidator(ClassValidatorSchema, { defaults });
	schemaTest(adapter, ['email', 'date', 'nospace', 'tags'], 'simple');
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
			nospace: z.string().regex(nospacePattern).optional(),
			extra: z.string().nullable()
		})
		.refine((a) => a)
		.refine((a) => a)
		.refine((a) => a);

	describe('with defaults', () => {
		it('defaultValues should return the schema defaults', () => {
			const values = defaultValues<z.infer<typeof bigZodSchema>>(zodToJSONSchema(bigZodSchema));
			expect(values.foo).toEqual(Foo.A);
		});

		it('should work with a function as default value, in strict mode', async () => {
			const schema = z.object({
				id: z.number().default(Math.random)
			});

			const v1 = await superValidate(zod(schema), { strict: true });
			const v2 = await superValidate(zod(schema), { strict: true });

			expect(v1.data.id).toBeGreaterThan(0);
			expect(v2.data.id).toBeGreaterThan(0);
			expect(v1.data.id).not.toBeCloseTo(v2.data.id, 6);
		});
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

	it('should produce a required enum if no default', () => {
		enum Fruits {
			Apple = 7,
			Banana = 8
		}

		const schema = z.object({
			nativeEnumInt: z.nativeEnum(Fruits),
			nativeEnumString: z.nativeEnum({ GRAY: 'GRAY', GREEN: 'GREEN' }).default('GREEN'),
			enum: z.enum(['a', 'b', 'c']),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			enumDef: z.enum(['a', 'b', 'c']).default('' as any)
		});

		const adapter = zod(schema);
		expect(adapter.jsonSchema.required).toEqual(['nativeEnumInt', 'enum', 'enumDef']);
		expect(adapter.defaults).toEqual({
			nativeEnumInt: Fruits.Apple,
			nativeEnumString: 'GREEN',
			enum: 'a',
			enumDef: ''
		});
	});

	it('should not require a default value for single type unions', () => {
		const schema = z.object({
			letter: z.union([z.literal('a'), z.literal('b')]),
			num: z.union([z.number().int().negative(), z.number()])
		});

		const adapter = zod(schema);
		expect(adapter.defaults).toEqual({ letter: 'a', num: 0 });
		expect(adapter.constraints.letter?.required).toBe(true);
		expect(adapter.constraints.num?.required).toBe(true);
	});

	it('should not require a default value for enums', () => {
		const schema = z.object({
			letter: z.enum(['a', 'b', 'c'])
		});

		const adapter = zod(schema);
		expect(adapter.defaults.letter).toBe('a');
		expect(adapter.constraints.letter?.required).toBe(true);
	});

	it('should accept ZodType for the adapter', () => {
		type User = {
			userId: string;
			name: string;
			manager?: User | null;
		};

		const UserSchema: z.ZodType<User> = z.object({
			userId: z.string().uuid(),
			name: z.string(),
			manager: z.union([z.null(), z.lazy(() => UserSchema)])
		});

		zod(UserSchema);

		const NumberSchema: z.ZodType<number> = z.number().int();
		// @ts-expect-error Not an object schema
		expect(() => zod(NumberSchema)).toThrowError(SchemaError);
	});

	it('cannot handle promises in optional refine', async () => {
		const schema = z.object({
			name: z.string().min(1),
			email: z
				.string()
				.optional()
				.refine(async () => Promise.resolve(true))
		});

		expect(() => zod(schema)).toThrow(Error);
	});

	it('with the errorMap option', async () => {
		const schema = z.object({
			num: z.number().int()
		});

		const options: { errorMap?: ZodErrorMap } = {
			errorMap: (error, ctx) => {
				if (error.code === z.ZodIssueCode.invalid_type) {
					return { message: 'Not an integer.' };
				}
				return { message: ctx.defaultError };
			}
		};

		const adapter = zod(schema, options);

		const form = await superValidate(
			// @ts-expect-error Testing errorMap with invalid type
			{ num: 'abc' },
			adapter
		);
		expect(form.valid).toBe(false);
		expect(form.errors.num).toEqual(['Not an integer.']);

		const sameAdapter = zod(schema, options);
		expect(sameAdapter).toBe(adapter);
	});

	describe('with z.record', () => {
		it('should work with additionalProperties for records', async () => {
			/*
			{
				type: 'object',
				properties: {
					id: { type: 'string' },
					options: {
						type: 'object',
						additionalProperties: {
							type: 'object',
							properties: { label: { type: 'string' } },
							required: [ 'label' ],
							additionalProperties: false
						}
					}
				},
				required: [ 'id', 'options' ],
				additionalProperties: false,
				'$schema': 'http://json-schema.org/draft-07/schema#'
			}
			*/
			const schema = z.object({
				id: z.string(),
				options: z.record(
					z.string(),
					z.object({
						label: z.string().refine((value) => value.length > 0, {
							message: 'Label is required'
						})
					})
				)
			});

			const row = {
				id: '1',
				options: {
					'1': {
						label: 'Option 1'
					},
					'2': {
						label: ''
					}
				}
			};

			const adapter = zod(schema);
			const form = await superValidate(row, adapter);

			assert(!form.valid);

			expect(form.errors).toStrictEqual({
				options: { '2': { label: ['Label is required'] } }
			});

			expect(form.data).toEqual(row);
		});
	});

	schemaTest(zod(schema));
});

/////////////////////////////////////////////////////////////////////

describe('vine', () => {
	const schema = Vine.object({
		name: Vine.string().optional(),
		email: Vine.string().email(),
		tags: Vine.array(Vine.string().minLength(2)).minLength(3),
		score: Vine.number().min(0),
		date: Vine.date().optional(),
		nospace: Vine.string().regex(nospacePattern).optional(),
		extra: Vine.string().nullable()
	});

	const adapter = vine(schema, { defaults });

	it('should accept string as input for inferred Date fields', async () => {
		const date = '2024-02-14';
		const form = await superValidate({ ...validData, date }, adapter);

		const realDate: Date | undefined = form.data.date;
		expect(realDate).toEqual(new Date(date + 'T00:00:00'));
	});

	schemaTest(adapter, ['email', 'nospace', 'tags'], 'simple', 'stringToDate');
});

describe('superstruct', () => {
	const email = () => ssDefine<string>('email', (value) => String(value).includes('@'));

	const schema = ssObject({
		name: ssOptional(ssString()),
		email: email(),
		tags: ssSize(ssArray(ssSize(ssString(), 2, Infinity)), 3, Infinity),
		score: ssMin(ssNumber(), 0),
		date: ssOptional(ssDate()),
		nospace: ssOptional(ssPattern(ssString(), nospacePattern)),
		extra: ssNullable(ssString())
	});

	const adapter = superstruct(schema, { defaults });

	schemaTest(adapter, undefined, 'simple');
});

describe('Effect', async () => {
	// effect deliberately does not provide email parsing out of the box
	// https://github.com/Effect-TS/schema/issues/294
	// i just found this regex online, does the job
	const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
	const schema = Schema.Struct({
		name: Schema.String.annotations({ default: 'Unknown' }),
		email: Schema.String.pipe(
			Schema.filter((s) => emailRegex.test(s) || 'must be a valid email', {
				jsonSchema: {}
			})
		),
		tags: Schema.Array(Schema.String.pipe(Schema.minLength(2))).pipe(Schema.minItems(3)),
		score: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
		date: Schema.DateFromSelf.annotations({
			jsonSchema: {
				type: 'date'
			}
		}).pipe(Schema.optional),
		nospace: Schema.String.pipe(Schema.pattern(nospacePattern), Schema.optional),
		extra: Schema.String.pipe(Schema.NullOr).annotations({ default: null })
	});

	const adapter = effect(schema);
	schemaTest(adapter);
});

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
		const schema = v.object({
			len: v.pipe(
				v.string(),
				v.transform((s) => s.length)
			)
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
	adapterType: 'full' | 'simple' = 'full',
	dateFormat: 'Date' | 'string' | 'stringToDate' = 'Date'
) {
	const validD = { ...validData, date: dateFormat !== 'Date' ? '2024-01-01' : validData.date };

	function missingError(error: string) {
		return `Validation error "${error}" not found`;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function expectErrors(errors: ErrorFields, errorMessages: Record<string, any>) {
		// console.log('🚀 ~ expectErrors ~ errorMessages:', errorMessages);

		if (errors.includes('nospace'))
			expect(errorMessages.nospace, missingError('nospace')).toBeTruthy();
		if (errors.includes('email')) expect(errorMessages.email, missingError('email')).toBeTruthy();
		if (errors.includes('date')) expect(errorMessages.date, missingError('date')).toBeTruthy();
		if (errors.includes('tags'))
			expect(errorMessages?.tags?._errors?.[0], missingError('tags')).toBeTruthy();
		if (errors.includes('tags[1]'))
			expect(errorMessages?.tags?.['1']?.[0], missingError('tags[1]')).toBeTruthy();

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
		const output = await superValidate(validD, adapter);
		expect(output.errors).toEqual({});
		expect(output.valid).toEqual(true);
		expect(output.data).not.toBe(validD);

		const date =
			dateFormat == 'Date'
				? validD.date
				: dateFormat == 'stringToDate'
					? new Date(validD.date + 'T00:00:00')
					: '2024-01-01';

		expect(output.data).toEqual({ ...validD, date });
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

		// it('should handle deep partial data', async () => {
		// 	const schema = z.object({
		// 		name: z.string(),
		// 		account: z
		// 			.object({
		// 				id: z.number().int().positive(),
		// 				comment: z.string()
		// 			})
		// 			.array()
		// 	});

		// 	const form = await superValidate(
		// 		{ name: 'Test', account: [{ comment: 'Comment' }, { id: 123 }] },
		// 		zod(schema)
		// 	);
		// 	expect(form.data.account).toEqual([
		// 		{ id: 0, comment: 'Comment' },
		// 		{ id: 123, comment: '' }
		// 	]);
		// });
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

	describe('Handling non-existing files', () => {
		const schema = z.object({
			image: z.instanceof(File, { message: 'Please upload a file.' }).refine((f) => {
				return f instanceof File && f.size <= 1000;
			}, 'Max 1Kb upload size.')
		});

		describe('Non-nullable schema', () => {
			it('should not accept a non-existing file', async () => {
				const formData = new FormData();
				const adapter = zod(schema);
				expect(adapter.defaults.image).toBeUndefined();

				const form = await superValidate(formData, adapter, { allowFiles: true });
				assert(!form.valid);
				expect(form.errors.image).toEqual(['Please upload a file.']);
			});

			it('should not accept an empty posted value', async () => {
				const formData = new FormData();
				formData.set('image', '');
				const form = await superValidate(formData, zod(schema), { allowFiles: true });

				assert(!form.valid);
				expect(form.errors.image).toEqual(['Please upload a file.']);
			});
		});

		describe('Nullable schema', () => {
			const schemaNullable = schema.extend({
				image: schema.shape.image.nullable()
			});

			it('should accept a non-existing file', async () => {
				const formData = new FormData();
				const form = await superValidate(formData, zod(schemaNullable), { allowFiles: true });

				assert(form.valid);
				expect(form.data.image).toBeNull();
			});

			it('should accept an empty posted value', async () => {
				const formData = new FormData();
				formData.set('image', '');
				const form = await superValidate(formData, zod(schemaNullable), { allowFiles: true });

				assert(form.valid);
				expect(form.data.image).toBeNull();
			});
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
			kitFail(400, withFiles({ form }));
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

describe('Array validation', () => {
	describe('should return an empty array as default when dataType is json', () => {
		const schema = z.object({
			testArray: z.object({ foo: z.string() }).array(),
			nested: z.object({
				arr: z.object({ foo: z.string() }).array()
			})
		});

		it('with the default values', async () => {
			const form = await superValidate(zod(schema));
			expect(form.errors.testArray?._errors).toBeUndefined();
			expect(form.data.testArray).toEqual([]);
			expect(form.errors.nested?.arr?._errors).toBeUndefined();
			expect(form.data.nested.arr).toEqual([]);
		});

		it('when passing data directly', async () => {
			const form = await superValidate({ testArray: undefined }, zod(schema), { errors: true });

			expect(form.errors.testArray?._errors).toEqual(['Required']);
			expect(form.data.testArray).toEqual([]);
			expect(form.errors.nested?.arr?._errors).toBeUndefined();
			expect(form.data.nested.arr).toEqual([]);
		});

		it('when passing an empty object', async () => {
			const form = await superValidate({}, zod(schema), { errors: true });

			expect(form.errors.testArray).toBeUndefined();
			expect(form.data.testArray).toEqual([]);
			expect(form.errors.nested?.arr?._errors).toBeUndefined();
			expect(form.data.nested.arr).toEqual([]);
		});

		it('when passing undefined', async () => {
			const form = await superValidate(undefined, zod(schema), { errors: true });

			expect(form.errors.testArray).toBeUndefined();
			expect(form.data.testArray).toEqual([]);
			expect(form.errors.nested?.arr?._errors).toBeUndefined();
			expect(form.data.nested.arr).toEqual([]);
		});
	});
});

describe('Top-level union', () => {
	it('should handle unions on the top-level', async () => {
		/*
		const schema: JSONSchema7 = {
			anyOf: [
				{
					type: 'object',
					properties: { type: { type: 'string', const: 'empty' } },
					required: ['type'],
					additionalProperties: false
				},
				{
					type: 'object',
					properties: {
						type: { type: 'string', const: 'extra' },
						roleId: { type: 'string' }
					},
					required: ['type', 'roleId'],
					additionalProperties: false
				}
			],
			$schema: 'http://json-schema.org/draft-07/schema#'
		};
		*/

		const schema = z.discriminatedUnion('type', [
			z.object({
				type: z.literal('empty')
			}),
			z.object({
				type: z.literal('extra'),
				roleId: z.string()
			})
		]);

		const formData = new FormData();
		formData.set('type', 'extra');
		formData.set('roleId', 'ABC');

		const form = await superValidate(formData, zod(schema));
		//console.log('🚀 ~ it ~ form:', form);

		assert(form.valid);
		assert(form.data.type == 'extra');

		const roleId: string = form.data.roleId;
		expect(roleId).toBe('ABC');
	});
});

describe('Enum validation', () => {
	const fishes = ['trout', 'tuna', 'shark'] as const;

	const schema = z.object({
		fish: z.enum(fishes),
		moreFish: z.enum(fishes)
	});

	const schema2 = schema.extend({
		fish: schema.shape.fish.nullable(),
		moreFish: schema.shape.moreFish.optional()
	});

	describe('With FormData', () => {
		it('should not return the default first enum value when an empty string is posted', async () => {
			const formData = new FormData();
			const adapter = zod(schema);
			const form = await superValidate(formData, adapter);
			assert(form.valid);
			expect(form.data).toEqual({ fish: 'trout', moreFish: 'trout' });

			formData.set('fish', '');
			const form2 = await superValidate(formData, adapter);
			assert(!form2.valid);
			expect(form2.data).toEqual({ fish: '', moreFish: 'trout' });
			expect(form2.errors.fish?.[0]).toMatch(/^Invalid enum value\./);
		});

		it('should still work with undefined or nullable', async () => {
			const formData = new FormData();
			const adapter = zod(schema2);
			const form = await superValidate(formData, adapter);
			assert(form.valid);
			expect(form.data).toEqual({ fish: null, moreFish: undefined });

			formData.set('fish', '');
			const form2 = await superValidate(formData, adapter);
			assert(form2.valid);
			expect(form2.data).toEqual({ fish: null, moreFish: undefined });
		});
	});

	describe('With data objects', () => {
		it('should add the default enum value if field does not exist', async () => {
			const adapter = zod(schema);
			const form = await superValidate({}, adapter);
			assert(form.valid);
			expect(form.data).toEqual({ fish: 'trout', moreFish: 'trout' });
		});

		it('should add the default null/undefined if field does not exist', async () => {
			const adapter = zod(schema2);
			const form = await superValidate({}, adapter);
			assert(form.valid);
			expect(form.data).toEqual({ fish: null, moreFish: undefined });
		});
	});
});

describe('Customized superValidate', () => {
	type SuperParams<T extends Record<string, unknown>> = Parameters<typeof superValidate<T>>;
	type ZodSchema = Parameters<typeof zod>[0];

	function zodValidate<T extends ZodSchema, M>(
		data: SuperParams<InferIn<T, 'zod'>>[0],
		schema: T,
		options?: SuperParams<Infer<T, 'zod'>>[2]
	) {
		return superValidate<Infer<T, 'zod'>, M, InferIn<T, 'zod'>>(data, zod(schema), options);
	}

	const zodSchema = z.object({
		num: z.number().int()
	});

	it('Should be type-safe', async () => {
		const v = await zodValidate(null, zodSchema);
		expect(v.data.num).toBe(0);
	});
});
