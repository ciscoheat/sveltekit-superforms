import type { Converter, Meta } from '../types.js';
import commonConverter from './common.js';

const dateConverter: Converter = (description, converters) => {
	const jsonSchema = commonConverter(description, converters);
	const meta: Meta = description.meta || {};

	jsonSchema.type = 'string';
	jsonSchema.format = 'date-time';

	return Object.assign(jsonSchema, meta.jsonSchema);
};

export default dateConverter;
