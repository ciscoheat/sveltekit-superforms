import type { Converter, Meta } from '../types.js';
import commonConverter from './common.js';

export const uuidRegExPattern =
	'^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$';

const stringConverter: Converter = (description, converters) => {
	const jsonSchema = commonConverter(description, converters);
	const meta: Meta = description.meta || {};

	description.tests.forEach((test) => {
		switch (test.name) {
			case 'length':
				if (test.params?.length !== undefined) {
					jsonSchema.minLength = Number(test.params.length);
					jsonSchema.maxLength = Number(test.params.length);
				}
				break;
			case 'min':
				if (test.params?.min !== undefined) {
					jsonSchema.minLength = Number(test.params.min);
				}
				break;
			case 'max':
				if (test.params?.max !== undefined) {
					jsonSchema.maxLength = Number(test.params.max);
				}
				break;
			case 'matches':
				if (test.params?.regex) {
					jsonSchema.pattern = (test.params.regex as RegExp)
						.toString()
						.replace(/^\/(.*)\/[gimusy]*$/, '$1');
				}
				break;
			case 'email':
				jsonSchema.format = 'email';
				break;
			case 'url':
				jsonSchema.format = 'uri';
				break;
			case 'uuid':
				jsonSchema.format = 'uuid';
				jsonSchema.pattern = uuidRegExPattern;
				break;
		}
	});

	return Object.assign(jsonSchema, meta.jsonSchema);
};

export default stringConverter;
