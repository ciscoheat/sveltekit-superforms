import type { Converter, Meta } from '../types.js';
import commonConverter from './common.js';

const numberConverter: Converter = (description, converters) => {
	const jsonSchema = commonConverter(description, converters);
	const meta: Meta = description.meta || {};

	description.tests.forEach((test) => {
		switch (test.name) {
			case 'min':
				if (test.params?.min !== undefined) {
					jsonSchema.minimum = Number(test.params.min);
				}
				if (test.params?.more !== undefined) {
					jsonSchema.exclusiveMinimum = Number(test.params.more);
				}
				break;
			case 'max':
				if (test.params?.max !== undefined) {
					jsonSchema.maximum = Number(test.params.max);
				}
				if (test.params?.less !== undefined) {
					jsonSchema.exclusiveMaximum = Number(test.params.less);
				}
				break;
			case 'integer':
				if (jsonSchema.type === 'number') {
					jsonSchema.type = 'integer';
				} else {
					// @ts-expect-error type is known
					jsonSchema.type = [...jsonSchema.type, 'integer'].filter((type) => type !== 'number');
				}
		}
	});

	return Object.assign(jsonSchema, meta.jsonSchema);
};

export default numberConverter;
