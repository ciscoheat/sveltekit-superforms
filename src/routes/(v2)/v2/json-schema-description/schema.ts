import type { JSONSchema } from '$lib/index.js';

export const schema = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	type: 'object',
	required: ['description'],
	properties: {
		description: {
			type: 'string',
			description: 'a string at least 10 character(s) long',
			minLength: 10
		}
	},
	additionalProperties: false
} as const satisfies JSONSchema;
