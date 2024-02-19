// Taken from https://github.com/lightsofapollo/joi-to-json-schema and converted to ESM
// TODO: Need more tests

import type { JSONSchema } from '../../jsonSchema/index.js';
import type { JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';

function assert(condition: unknown, errorMessage: string) {
	if (!condition) throw new Error(errorMessage);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Joi = Record<string, any>;

type Transformer = (schema: JSONSchema, joi: Joi, transformer?: Transformer) => JSONSchema;

const TYPES: Record<string, Transformer> = {
	alternatives: (schema: JSONSchema, joi: Joi, transformer) => {
		const result = (schema.oneOf = [] as JSONSchema[]);

		joi.matches.forEach(function (match: Record<string, unknown>) {
			if (match.schema) {
				return result.push(convert(match.schema, transformer));
			}

			if (!match.is) {
				throw new Error('joi.when requires an "is"');
			}
			if (!(match.then || match.otherwise)) {
				throw new Error('joi.when requires one or both of "then" and "otherwise"');
			}

			if (match.then) {
				result.push(convert(match.then, transformer));
			}

			if (match.otherwise) {
				result.push(convert(match.otherwise, transformer));
			}
		});
		return schema;
	},

	date: (schema: JSONSchema) => {
		schema.type = 'Date' as JSONSchema7TypeName;
		/*
		if (joi._flags.timestamp) {
			schema.type = 'integer';
			schema.format = 'unix-time';
			return schema;
		}

		schema.type = 'string';
		schema.format = 'date-time';
		*/
		return schema;
	},

	any: (schema: JSONSchema) => {
		delete schema.type;
		//schema.type = ['array', 'boolean', 'number', 'object', 'string', 'null'];
		return schema;
	},

	array: (schema: JSONSchema, joi: Joi, transformer) => {
		schema.type = 'array';

		joi._rules?.forEach((test: { name: string; args: { limit: number | undefined } }) => {
			switch (test.name) {
				case 'unique':
					schema.uniqueItems = true;
					break;
				case 'length':
					schema.minItems = schema.maxItems = test.args.limit;
					break;
				case 'min':
					schema.minItems = test.args.limit;
					break;
				case 'max':
					schema.maxItems = test.args.limit;
					break;
			}
		});

		if (joi.$_terms) {
			/*
			Ordered is not a part of the spec.
			if (joi.$_terms.ordered.length) {
				schema.ordered = joi.$_terms.ordered.map((item) => convert(item, transformer));
			}
			*/

			let list;
			if (joi.$_terms._inclusions.length) {
				list = joi.$_terms._inclusions;
			} else if (joi.$_terms._requireds.length) {
				list = joi.$_terms._requireds;
			}

			if (list) {
				schema.items = convert(list[0], transformer);
			}
		}

		return schema;
	},

	binary: (schema: JSONSchema, joi: Joi) => {
		schema.type = 'string';
		schema.contentMediaType =
			joi._meta.length > 0 && joi._meta[0].contentMediaType
				? joi._meta[0].contentMediaType
				: 'text/plain';
		schema.contentEncoding = joi._flags.encoding ? joi._flags.encoding : 'binary';
		return schema;
	},

	boolean: (schema: JSONSchema) => {
		schema.type = 'boolean';
		return schema;
	},

	number: (schema: JSONSchema, joi: Joi) => {
		schema.type = 'number';
		joi._rules?.forEach((test: { name: string; args: { limit: number | undefined } }) => {
			switch (test.name) {
				case 'integer':
					schema.type = 'integer';
					break;
				case 'less':
					//schema.exclusiveMaximum = true;
					//schema.maximum = test.args.limit;
					schema.exclusiveMaximum = test.args.limit;
					break;
				case 'greater':
					//schema.exclusiveMinimum = true;
					//schema.minimum = test.args.limit;
					schema.exclusiveMinimum = test.args.limit;
					break;
				case 'min':
					schema.minimum = test.args.limit;
					break;
				case 'max':
					schema.maximum = test.args.limit;
					break;
				case 'precision': {
					let multipleOf;
					if (test.args.limit && test.args.limit > 1) {
						multipleOf = JSON.parse('0.' + '0'.repeat(test.args.limit - 1) + '1');
					} else {
						multipleOf = 1;
					}
					schema.multipleOf = multipleOf;
					break;
				}
			}
		});
		return schema;
	},

	string: (schema: JSONSchema, joi: Joi) => {
		schema.type = 'string';

		joi._rules.forEach((test: { name: string; args: { limit?: number; regex?: RegExp } }) => {
			switch (test.name) {
				case 'email':
					schema.format = 'email';
					break;
				case 'pattern':
				case 'regex': {
					const arg = test.args;
					const pattern = arg && arg.regex ? arg.regex : arg;
					schema.pattern = String(pattern).replace(/^\//, '').replace(/\/$/, '');
					break;
				}
				case 'min':
					schema.minLength = test.args.limit;
					break;
				case 'max':
					schema.maxLength = test.args.limit;
					break;
				case 'length':
					schema.minLength = schema.maxLength = test.args.limit;
					break;
				case 'uri':
					schema.format = 'uri';
					break;
			}
		});

		return schema;
	},

	object: (schema: JSONSchema, joi: Joi, transformer) => {
		schema.type = 'object';
		schema.properties = {};
		schema.additionalProperties = Boolean(joi._flags.allowUnknown || !joi._inner.children);
		schema.pattern =
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			joi.patterns?.map((pattern: { regex: RegExp; rule: Record<string, any> }) => {
				return { regex: pattern.regex, rule: convert(pattern.rule, transformer) };
			}) ?? [];

		if (!joi.$_terms.keys?.length) {
			return schema;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		joi.$_terms.keys.forEach((property: { schema: Record<string, any>; key: string }) => {
			if (property.schema._flags.presence !== 'forbidden') {
				if (!schema.properties) schema.properties = {};
				schema.properties[property.key] = convert(property.schema, transformer);
				if (
					property.schema._flags.presence === 'required' ||
					(property.schema._settings &&
						property.schema._settings.presence === 'required' &&
						property.schema._flags.presence !== 'optional')
				) {
					schema.required = schema.required || [];
					schema.required.push(property.key);
				}
			}
		});

		return schema;
	}
};

/**
 * Converts the supplied joi validation object into a JSON schema object,
 * optionally applying a transformation.
 *
 * @param {JoiValidation} joi
 * @param {TransformFunction} [transformer=null]
 * @returns {JSONSchema}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function convert(joi: Record<string, any>, transformer?: Transformer): JSONSchema {
	assert('object' === typeof joi && 'type' in joi, 'requires a joi schema object');

	if (!TYPES[joi.type]) {
		throw new Error(`sorry, do not know how to convert unknown joi type: "${joi.type}"`);
	}

	if (transformer) {
		assert('function' === typeof transformer, 'transformer must be a function');
	}

	// JSON Schema root for this type.
	const schema: JSONSchema = {};

	// Copy over the details that all schemas may have...
	if (joi._description) {
		schema.description = joi._description;
	}

	if (joi._examples && joi._examples.length > 0) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		schema.examples = joi._examples.map((e: { value: any }) => e.value);
	}

	if (joi._examples && joi._examples.length === 1) {
		schema.examples = joi._examples[0].value;
	}

	// Add the label as a title if it exists
	if (joi._settings && joi._settings.language && joi._settings.language.label) {
		schema.title = joi._settings.language.label;
	} else if (joi._flags && joi._flags.label) {
		schema.title = joi._flags.label;
	}

	// Checking for undefined and null explicitly to allow false and 0 values
	if (joi._flags && joi._flags.default !== undefined && joi._flags.default !== null) {
		schema['default'] = joi._flags.default;
	}

	if (joi._valids && joi._valids._set && (joi._valids._set.size || joi._valids._set.length)) {
		if (Array.isArray(joi.children) || !joi._flags.allowOnly) {
			return {
				anyOf: [
					{
						type: joi.type,
						enum: [...joi._valids._set]
					},
					TYPES[joi.type](schema, joi as Joi, transformer)
				]
			};
		}
		schema['enum'] = [...joi._valids._set];
	}

	let result = TYPES[joi.type](schema, joi as Joi, transformer);

	if (transformer) {
		result = transformer(result, joi as Joi);
	}

	if (joi._valids?._values && joi._valids._values.size && !joi._flags.allowOnly) {
		const constants = Array.from(joi._valids._values).map((v) => ({
			const: v
		})) as JSONSchema7Definition[];

		if (result.anyOf) {
			result.anyOf = [...constants, ...result.anyOf];
		} else {
			result = { anyOf: [...constants, result] };
		}
	}

	return result;
}

//module.exports = convert;
convert.TYPES = TYPES;

/**
 * Joi Validation Object
 * @typedef {object} JoiValidation
 */

/**
 * Transformation Function - applied just before `convert()` returns and called as `function(object):object`
 * @typedef {function} TransformFunction
 */

/**
 * JSON Schema Object
 * @typedef {object} JSONSchema
 */
