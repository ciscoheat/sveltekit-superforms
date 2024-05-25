import type { Infer } from '$lib/index.js';
import { z } from 'zod';

export const eventSchema = z.object({
	name: z.string(),
	desc: z.string().nullable()
});

export const eventTemplateSchema = z.object({
	name: z.string(),
	id: z.string()
});

export const admissionSchema = z.object({
	name: z.string()
});

export const schema = z.union([eventTemplateSchema, eventSchema, admissionSchema]);

export type UnionSchema =
	| Infer<typeof eventSchema>
	| Infer<typeof admissionSchema>
	| Infer<typeof eventTemplateSchema>;
