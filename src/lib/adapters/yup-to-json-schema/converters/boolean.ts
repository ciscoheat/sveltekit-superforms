import type { Converter, Meta } from '../types.js';
import commonConverter from './common.js';

const booleanConverter: Converter = (description, converters) => {
	const jsonSchema = commonConverter(description, converters);
	const meta: Meta = description.meta || {};
	return Object.assign(jsonSchema, meta.jsonSchema);
};

export default booleanConverter;
