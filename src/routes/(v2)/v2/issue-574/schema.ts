import type { JSONSchema } from '$lib/index.js';

export const schema = {
	type: 'object',
	additionalProperties: false,
	required: ['arr'],
	properties: {
		arr: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['arr'],
				properties: {
					arr: {
						type: 'array',
						items: {
							type: 'object',
							additionalProperties: false,
							properties: {
								tryInvalidValue: {
									type: 'string',
									minLength: 5
								}
							}
						}
					}
				}
			}
		}
	}
} as const satisfies JSONSchema;
