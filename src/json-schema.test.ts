import { describe, it, expect } from 'vitest';
import type { JSONSchema7 } from 'json-schema';
import { defaultValues } from '$lib/schemaMeta/jsonSchema.js';

/*
ZodString
ZodNumber
ZodBoolean
ZodBoolean
ZodDate
ZodArray
ZodBigInt
ZodLiteral
ZodUnion
ZodEnum
ZodNativeEnum
ZodAny
ZodSymbol
ZodObject
*/

enum Fruits {
	Apple,
	Banana
}

enum FruitsStr {
	Apple = 'Apple',
	Banana = 'Banana'
}

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
		'trimmedString',
		'numberArray',
		'nativeEnumInt',
		'nativeEnumString',
		'nativeEnumString2'
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
		numberArray: {
			type: 'array',
			items: {
				type: 'integer'
			},
			default: NaN
		},
		date: {
			format: 'date-time',
			default: new Date().toISOString()
		},
		coercedNumber: {
			type: 'number',
			default: 0
		},
		coercedDate: {
			format: 'date-time'
		},
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
			default: FruitsStr.Apple
		}
	}
} satisfies JSONSchema7;

const schema2: JSONSchema7 = {
	//$schema: 'https://json-schema.org/draft/2020-12/schema',
	//$id: 'https://example.com/product.schema.json',
	//title: 'Product',
	//description: "A product from Acme's catalog",
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
	required: ['productId', 'productName', 'price', 'dimensions']
};

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
	}
};

describe.only('JSON schema validation', () => {
	it('Should transform Zod schemas to the JSON schema subset', () => {
		expect(defaultValues(schema2)).toEqual({
			productId: 0,
			productName: '',
			price: 234,
			tags: undefined,
			dimensions: { length: 0, width: 0, height: 0 }
		});

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
			numberArray: NaN,
			date: undefined,
			coercedNumber: undefined,
			coercedDate: undefined
		});
	});
});
