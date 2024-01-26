import type { JSONSchema7 } from 'json-schema';
import type { SchemaDescription } from 'yup';
import type { Converter, Converters, Meta } from '../types.js';
import commonConverter from './common.js';

type ObjectDescription = SchemaDescription & {
	fields: { [key: string]: SchemaDescription };
};

// @ts-expect-error description is known
const objectConverter: Converter = (description: ObjectDescription, converters) => {
	/*   Yup automatically adds an object where each key is undefined as the deafault in its description. So objects automatically get a default :(. The developer should use jsonSchema({ default: undefined }) to remedy this */
	const jsonSchema = commonConverter(description, converters);
	const meta: Meta = description.meta || {};
	const properties: Record<string, JSONSchema7> = {};
	const required: string[] = [];

	Object.keys(description.fields).forEach((fieldName) => {
		const fieldDescription = description.fields[fieldName];
		const converter = converters[fieldDescription.type as keyof Converters];
		properties[fieldName] = converter(fieldDescription, converters);
		if (!fieldDescription.optional) {
			required.push(fieldName);
		}
	});

	if (Object.keys(properties).length > 0) {
		jsonSchema.properties = properties;
	}

	if (Object.keys(required).length > 0) {
		jsonSchema.required = required;
	}

	return Object.assign(jsonSchema, meta.jsonSchema);
};

export default objectConverter;
