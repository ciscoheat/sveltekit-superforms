import { describe, it, expect, assert } from 'vitest';
import type { JSONSchema7 } from 'json-schema';
import { schemaInfo } from '$lib/jsonSchema/schemaInfo.js';
import type { FromSchema } from 'json-schema-to-ts';
import { defaultValues, defaultTypes } from '$lib/jsonSchema/schemaDefaults.js';
import { schemaShape, shapeFromObject } from '$lib/jsonSchema/schemaShape.js';
import { z } from 'zod';
import { zod, zodToJSONSchema } from '$lib/adapters/zod.js';
import { schemaHash } from '$lib/jsonSchema/schemaHash.js';
import { constraints } from '$lib/jsonSchema/constraints.js';
import { SchemaError } from '$lib/errors.js';
import type { Infer } from '$lib/index.js';

const schema = {
	type: 'object',
	required: [
		'string',
		'email',
		'bool',
		'agree',
		'number',
		'proxyNumber',
		'nullableString',
		'proxyString',
		'trimmedString'
	],
	properties: {
		string: {
			type: 'string',
			default: 'Shigeru'
		},
		email: {
			type: 'string'
		},
		bool: {
			type: 'boolean'
		},
		agree: {
			type: 'boolean',
			const: true,
			default: true
		},
		number: {
			type: 'number'
		},
		proxyNumber: {
			type: 'number',
			default: 0
		},
		nullableString: {
			type: ['string', 'null']
		},
		nullishString: {
			type: ['string', 'null']
		},
		optionalString: {
			type: ['string']
		},
		proxyString: {
			type: ['string']
		},
		trimmedString: {
			type: ['string']
		},
		coercedNumber: {
			type: 'number',
			default: 0
		},
		coercedDate: {
			type: 'string',
			format: 'date-time'
		}
	}
} satisfies JSONSchema7;

const defaultTestSchema: JSONSchema7 = {
	type: 'object',
	properties: {
		name: { type: 'string' },
		age: { type: 'integer', default: 25 },
		email: { type: 'string', format: 'email' },
		gender: {
			type: 'string',
			anyOf: [{ enum: ['male', 'female'] }, { type: 'string', default: 'other' }]
		}
	},
	required: ['gender']
};

describe('Default values', () => {
	it('should map primitive types to default values', () => {
		expect(defaultValues(schema)).toEqual({
			agree: true,
			string: 'Shigeru',
			email: '',
			bool: false,
			number: 0,
			proxyNumber: 0,
			nullableString: null,
			nullishString: null,
			proxyString: '',
			trimmedString: '',
			coercedNumber: 0
		});
	});

	it('should map arrays to the underlying type', () => {
		const schema = {
			type: 'object',
			properties: {
				numberArray: {
					type: 'array',
					items: {
						type: 'integer',
						default: NaN
					}
				}
			},
			required: ['numberArray'] as string[]
		} satisfies JSONSchema7;

		expect(defaultValues(schema)).toEqual({
			numberArray: []
		});
	});

	it('should use the default value for enums if set', () => {
		enum Fruits {
			Apple = 2,
			Banana = 3
		}

		enum FruitsStr {
			Apple = 'Apple',
			Banana = 'Banana'
		}

		const schema = {
			type: 'object',
			properties: {
				nativeEnumInt: {
					type: 'number',
					enum: Object.values(Fruits),
					default: Fruits.Apple
				},
				nativeEnumString: {
					type: 'string',
					enum: ['GRAY', 'GREEN'],
					default: 'GREEN'
				},
				nativeEnumString2: {
					type: 'string',
					enum: Object.values(FruitsStr),
					default: FruitsStr.Banana
				}
			}
		} satisfies JSONSchema7;

		expect(defaultValues(schema)).toEqual({
			nativeEnumInt: 2,
			nativeEnumString: 'GREEN',
			nativeEnumString2: 'Banana'
		});
	});

	it('should map default values for enums to the first enum value', () => {
		enum Fruits {
			Apple = 2,
			Banana = 3
		}

		enum FruitsStr {
			Apple = 'Apple',
			Banana = 'Banana'
		}

		const schema = {
			type: 'object',
			required: ['nativeEnumInt', 'nativeEnumString', 'nativeEnumString2'],
			properties: {
				nativeEnumInt: {
					type: 'number',
					enum: Object.keys(Fruits).map(parseInt)
				},
				nativeEnumString: {
					type: 'string',
					enum: ['GRAY', 'GREEN']
				},
				nativeEnumString2: {
					type: 'string',
					enum: Object.values(FruitsStr)
				}
			}
		} satisfies JSONSchema7;

		expect(defaultValues(schema)).toEqual({
			nativeEnumInt: 2,
			nativeEnumString: 'GRAY',
			nativeEnumString2: 'Apple'
		});
	});

	it('should handle native Date through the unix-time format', () => {
		const date = new Date();
		const schema = {
			type: 'object',
			properties: {
				date: {
					type: 'integer',
					format: 'unix-time',
					default: date.getTime()
				}
			},
			additionalProperties: false
		} as const satisfies JSONSchema7;

		const defaults = defaultValues<
			FromSchema<
				typeof schema,
				{
					deserialize: [
						{
							pattern: {
								type: 'integer';
								format: 'unix-time';
							};
							output: Date;
						}
					];
				}
			>
		>(schema);

		expect(defaults.date?.getTime()).toEqual(date.getTime());
	});

	it('should work with extra properties on the schema', () => {
		const schema2: JSONSchema7 = {
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			$id: 'https://example.com/product.schema.json',
			title: 'Product',
			description: "A product from Acme's catalog",
			type: 'object',
			properties: {
				productId: {
					type: 'integer'
				},
				productName: {
					type: 'string'
				},
				price: {
					type: 'number',
					exclusiveMinimum: 0,
					default: 234
				},
				tags: {
					type: 'array',
					items: {
						type: 'string'
					},
					minItems: 1,
					uniqueItems: true
				},
				dimensions: {
					type: 'object',
					properties: {
						length: {
							type: 'number'
						},
						width: {
							type: 'number'
						},
						height: {
							type: 'number'
						}
					},
					required: ['length', 'width', 'height']
				},
				warehouseLocation: {
					$ref: 'https://example.com/geographical-location.schema.json'
				}
			},
			required: ['productId', 'productName', 'price', 'dimensions', 'tags']
		};

		const defs = defaultValues(schema2);

		expect('warehouseLocation' in defs).toBe(true);
		expect(defs).toEqual({
			productId: 0,
			productName: '',
			price: 234,
			tags: [],
			dimensions: { length: 0, width: 0, height: 0 }
		});
	});

	it('should map the default value of a union (anyOf) if only one default value exists.', () => {
		expect(defaultValues(defaultTestSchema)).toEqual({
			gender: 'other',
			age: 25
		});

		// @ts-expect-error Quick patching the test data
		defaultTestSchema.properties.gender.anyOf[0].default = 'male';

		expect(() => defaultValues(defaultTestSchema)).toThrow();

		// @ts-expect-error Quick patching the test data
		delete defaultTestSchema.properties.gender.anyOf[0].default;
		// @ts-expect-error Quick patching the test data
		delete defaultTestSchema.properties.gender.anyOf[1].default;

		expect(() => defaultValues(defaultTestSchema)).toThrow();

		// @ts-expect-error Quick patching the test data
		defaultTestSchema.properties.gender.default = 'female';

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(defaultValues<any>(defaultTestSchema).gender).toEqual('female');
	});

	it('should work with nullable', () => {
		const userSchema = z.object({
			gender: z.enum(['male', 'female', 'other']).default('male').nullish()
		});

		const adapter = zod(userSchema);
		expect(defaultValues(adapter.jsonSchema).gender).toBe('male');
	});
});

describe('Unions (anyOf)', () => {
	it('should collect types from unions', () => {
		const unionSchema: JSONSchema7 = {
			type: 'string',
			anyOf: [
				{ enum: ['male', 'female'] },
				{ type: 'string', default: 'other' },
				{ type: 'number', minimum: 5 },
				{ type: 'null' }
			]
		};

		const infos = schemaInfo(unionSchema, false, []);
		assert(infos);

		expect(infos.schema).toBe(unionSchema);
		expect(infos.isNullable).toBe(true);
		expect(infos.isOptional).toBe(false);
		expect(infos.types).toEqual(['string', 'number']);

		const filtered = unionSchema.anyOf?.filter((s) => typeof s !== 'boolean' && s.type !== 'null');
		assert(infos.union);
		expect(infos.union).toEqual(filtered);
	});
});

describe('Object shapes', () => {
	const schema = z.object({
		tags: z
			.object({
				id: z.number(),
				names: z.string().min(2).array(),
				test: z.union([z.string(), z.string().array()])
			})
			.array()
			.min(2)
	});

	it('should return correct info about nested objects and arrays', () => {
		expect(schemaShape(zodToJSONSchema(schema))).toStrictEqual({
			tags: { names: {}, test: {} }
		});
	});

	it('should return correct info about arrays in the schema', () => {
		const schema = {
			type: 'object',
			properties: {
				numberArray: {
					type: 'array',
					items: {
						type: 'integer',
						default: NaN
					}
				},
				name: {
					type: 'string'
				}
			}
		} satisfies JSONSchema7;

		expect(schemaShape(schema)).toEqual({
			numberArray: {}
		});
	});

	it('should return the same with the shapeFromObject function', () => {
		const data = {
			tags: [
				{ id: 1, names: ['aa', 'bb'], test: '' },
				{ id: 2, names: ['bb', 'cc'], test: ['aaa'] }
			]
		} satisfies Infer<typeof schema>;

		assert(schema.safeParse(data).success);
		expect(shapeFromObject(data)).toEqual({ tags: { names: {}, test: {} } });
	});
});

describe('Schema hash function', () => {
	it('should return a hash for a schema based on types and properties', () => {
		expect(schemaHash(schema)).toBe('1ipmquz');
		expect(schemaHash(defaultTestSchema)).toBe('1t18imi');
	});
});

describe('Constraints', () => {
	it('should merge the constraints for unions', () => {
		const adapter = zod(
			z.object({
				mixed: z
					.union([
						z
							.string()
							.min(5)
							.max(10)
							.regex(/^[A-Z]/),
						z.number().int().positive().max(100)
					])
					.default('A string')
			})
		);

		expect(constraints(adapter.jsonSchema)).toEqual({
			mixed: {
				pattern: '^[A-Z]',
				minlength: 5,
				maxlength: 10,
				min: 1,
				max: 100
			}
		});
	});

	it('should merge the constraints for intersections', () => {
		enum ProfileType {
			STUDENT = 'STUDENT',
			FACULTY = 'FACULTY',
			STAFF = 'STAFF'
		}

		const studentZSchema = z.object({
			yearOfStudy: z.number().min(1),
			branch: z.string().min(2),
			department: z.string().min(2),
			studentId: z.string().min(2),
			clubs: z.array(z.string()).optional()
		});

		const facultyZSchema = z.object({
			department: z.string().min(2),
			branch: z.string().min(2),
			designation: z.string().min(2),
			facultyId: z.string().min(2)
		});

		const staffZSchema = z.object({
			department: z.string().min(2),
			branch: z.string().min(2),
			designation: z.string().min(2),
			staffId: z.string().min(2)
		});

		const profileSchema = z
			.discriminatedUnion('type', [
				z.object({
					type: z.literal(ProfileType.STUDENT),
					typeData: studentZSchema
				}),
				z.object({
					type: z.literal(ProfileType.FACULTY),
					typeData: facultyZSchema
				}),
				z.object({
					type: z.literal(ProfileType.STAFF),
					typeData: staffZSchema
				})
			])
			.default({
				type: ProfileType.STUDENT,
				typeData: { yearOfStudy: 1, branch: '', department: '', studentId: '' }
			});

		const UserProfileZodSchema = z
			.object({
				name: z.string().min(2),
				email: z.string().email(),
				type: z.nativeEnum(ProfileType)
			})
			.and(profileSchema);

		const jsonSchema = zod(UserProfileZodSchema).jsonSchema;
		expect(constraints(jsonSchema)).toEqual({
			type: { required: true },
			typeData: {
				yearOfStudy: { min: 1, required: true },
				branch: { minlength: 2, required: true },
				department: { minlength: 2, required: true },
				studentId: { minlength: 2, required: true },
				designation: { minlength: 2, required: true },
				facultyId: { minlength: 2, required: true },
				staffId: { minlength: 2, required: true }
			},
			name: { minlength: 2, required: true },
			email: { required: true }
		});
	});
});

describe('Unions', () => {
	const schemaUnion = z
		.union([
			z
				.object({
					name: z.string().min(1)
				})
				.default({ name: 'Test' }),
			z.object({
				number: z.number().int()
			})
		])
		.default({ name: 'Test' });

	const discriminated = z.object({
		name: z.string().min(1),
		entity: z
			.discriminatedUnion('type', [
				z.object({ type: z.literal('person'), DOB: z.date() }),
				z.object({ type: z.literal('corporate'), taxId: z.string().min(5) })
			])
			.default({ type: 'person', DOB: new Date() })
	});

	it('should handle default values properly', async () => {
		const defaults = zod(discriminated).defaults;
		expect(defaults.name).toBe('');
		assert(defaults.entity.type == 'person');
		expect(defaults.entity.DOB).toBeInstanceOf(Date);
	});

	it('should handle schema unions', async () => {
		expect(zod(schemaUnion).defaults).toEqual({
			name: 'Test'
		});
	});

	it('should require an explicit default value', () => {
		expect(() =>
			zod(
				z.object({
					union: z.union([z.date(), z.string()])
				})
			)
		).toThrowError(SchemaError);
	});

	it('should fail resolving a union of a date and a number/integer', () => {
		expect(() =>
			zod(
				z.object({
					dateNumber: z.union([z.date(), z.number().int().positive().max(100)]).default(1)
				})
			)
		).toThrowError(SchemaError);
	});

	describe('Array unions', () => {
		it('should return an empty array as default value', () => {
			const arrays = z.object({
				tags: z.union([
					z.object({ id: z.number(), num: z.number() }).array(),
					z.object({ id: z.string(), name: z.string() }).array()
				])
			});

			const adapter = zod(arrays);
			expect(adapter.defaults).toEqual({ tags: [] });
		});
	});

	describe('Discriminated unions and intersections', () => {
		enum ProfileType {
			STUDENT = 'STUDENT',
			FACULTY = 'FACULTY',
			STAFF = 'STAFF'
		}

		const studentZSchema = z.object({
			yearOfStudy: z.number().min(1),
			branch: z.string().min(2),
			department: z.string().min(2),
			studentId: z.string().min(2),
			clubs: z.array(z.string()).optional()
		});

		const facultyZSchema = z.object({
			department: z.string().min(2),
			branch: z.string().min(2),
			designation: z.string().min(2),
			facultyId: z.string().min(2)
		});

		const staffZSchema = z.object({
			department: z.string().min(2),
			branch: z.string().min(2),
			designation: z.string().min(2),
			staffId: z.string().min(2)
		});

		const profileSchema = z.discriminatedUnion('type', [
			z.object({
				type: z.literal(ProfileType.STUDENT),
				typeData: studentZSchema
			}),
			z.object({
				type: z.literal(ProfileType.FACULTY),
				typeData: facultyZSchema
			}),
			z.object({
				type: z.literal(ProfileType.STAFF),
				typeData: staffZSchema
			})
		]);

		const UserProfileZodSchema = z
			.object({
				name: z.string().min(2),
				email: z.string().email(),
				type: z.nativeEnum(ProfileType)
			})
			.and(profileSchema);

		it('should merge properties of object unions together', () => {
			const adapter = zod(UserProfileZodSchema);

			expect(adapter.defaults).toEqual({
				name: '',
				email: '',
				type: ProfileType.STUDENT,
				typeData: {
					yearOfStudy: 0,
					branch: '',
					department: '',
					studentId: '',
					clubs: undefined,
					designation: '',
					facultyId: '',
					staffId: ''
				}
			});
		});
	});
});

describe('Default value types', () => {
	const schema = z.object({
		name: z.string(),
		len: z
			.string()
			.transform((s) => s.length)
			.pipe(z.number().min(5)),
		nested: z.object({
			tags: z.string().min(2).nullable().array().min(1),
			idTags: z.object({ name: z.string().optional(), id: z.number().int() }).array().min(1),
			score: z.number()
		}),
		no: z.date().optional()
	});

	const adapter = zod(schema);

	it('should return the types for each field', () => {
		expect(defaultTypes(adapter.jsonSchema)).toEqual({
			__types: ['object'],
			name: { __types: ['string'] },
			len: { __types: ['number'] },
			nested: {
				__types: ['object'],
				tags: {
					__types: ['array'],
					__items: { __types: ['string', 'null'] }
				},
				idTags: {
					__types: ['array'],
					__items: {
						__types: ['object'],
						id: { __types: ['integer'] },
						name: { __types: ['string', 'undefined'] }
					}
				},
				score: { __types: ['number'] }
			},
			no: {
				__types: ['unix-time', 'undefined']
			}
		});
	});
});
