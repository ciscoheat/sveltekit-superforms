import { z } from 'zod';
import type { JSONSchema } from '$lib/index.js';

export const loginZodSchema = z.object({
	name: z.string().min(5).default('Superform'),
	email: z.string().email()
});

export const loginJSONSchema = {
	type: 'object',
	properties: {
		name: { type: 'string', minLength: 5, default: 'Superform' },
		email: { type: 'string', format: 'email' }
	},
	required: ['name', 'email'],
	additionalProperties: false,
	$schema: 'http://json-schema.org/draft-07/schema#'
} as const satisfies JSONSchema;
