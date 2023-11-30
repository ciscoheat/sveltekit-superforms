import { describe, it, expect } from 'vitest';
import type { JSONSchema7 } from 'json-schema';
import { defaultValues } from '$lib/schemaMeta/jsonSchema.js';
import type { FromSchema } from 'json-schema-to-ts';

describe('JSON schema validation', () => {
	it('Should map primitive types to default values', () => {
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
					format: 'date-time'
				}
			}
		} satisfies JSONSchema7;

		expect(defaultValues(schema)).toEqual({
			agree: true,
			string: 'Shigeru',
			email: '',
			bool: false,
			number: 0,
			proxyNumber: 0,
			nullableString: null,
			nullishString: null,
			optionalString: undefined,
			proxyString: '',
			trimmedString: '',
			coercedNumber: 0,
			coercedDate: undefined
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
			// TODO: Default value for an array with an item that has a default value?
			numberArray: []
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
					enum: Object.values(Fruits),
					default: Fruits.Apple
				},
				nativeEnumString: {
					enum: ['GRAY', 'GREEN'],
					default: 'GREEN'
				},
				nativeEnumString2: {
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

		expect(defaultValues(schema2)).toEqual({
			productId: 0,
			productName: '',
			price: 234,
			tags: [],
			dimensions: { length: 0, width: 0, height: 0 }
		});
	});

	it('should map the default value of a union (anyOf) to the first type with a default value', () => {
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

		expect(defaultValues(defaultTestSchema)).toEqual({
			name: undefined,
			email: undefined,
			gender: 'other',
			age: 25
		});
	});
});
