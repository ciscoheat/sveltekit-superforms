import type { SchemaDescription } from 'yup';
import type { Converter, Converters, Meta } from '../types.js';
import commonConverter from './common.js';

type ArrayDescription = SchemaDescription & { innerType?: SchemaDescription };

const arrayConverter: Converter = (description: ArrayDescription, converters) => {
	const jsonSchema = commonConverter(description, converters);
	const meta: Meta = description.meta || {};
	const { innerType } = description;

	if (innerType) {
		const converter = converters[innerType.type as keyof Converters];
		jsonSchema.items = converter(innerType, converters);
	}

	description.tests.forEach((test) => {
		switch (test.name) {
			case 'length':
				if (test.params?.length !== undefined) {
					jsonSchema.minItems = jsonSchema.maxItems = Number(test.params.length);
				}
				break;
			case 'min':
				if (test.params?.min !== undefined) {
					jsonSchema.minItems = Number(test.params.min);
				}
				break;
			case 'max':
				if (test.params?.max !== undefined) {
					jsonSchema.maxItems = Number(test.params.max);
				}
				break;
		}
	});

	return Object.assign(jsonSchema, meta.jsonSchema);
};

export default arrayConverter;
