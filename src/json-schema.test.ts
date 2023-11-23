import { describe, it, expect } from 'vitest';

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

const schema = {
	//$schema: 'https://json-schema.org/draft/2020-12/schema',
	//$id: 'https://example.com/product.schema.json',
	//title: 'Product',
	//description: "A product from Acme's catalog",
	type: 'object',
	properties: {
		productId: {
			description: 'The unique identifier for a product',
			type: 'integer'
		},
		productName: {
			description: 'Name of the product',
			type: 'string'
		},
		price: {
			description: 'The price of the product',
			type: 'number',
			exclusiveMinimum: 0
		},
		tags: {
			description: 'Tags for the product',
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
			description: 'Coordinates of the warehouse where the product is located.',
			$ref: 'https://example.com/geographical-location.schema.json'
		}
	},
	required: ['productId', 'productName', 'price']
};

describe('JSON schema validation', () => {
	it('Should validate JSON schemas', () => {});
});
