import { z } from 'zod';

export const schemaUnion = z.union([
	z.object({
		name: z.string().min(1)
	}),
	z.object({
		number: z.number().int()
	})
]);

export const schema = z.object({
	name: z.string().min(1),
	entity: z
		.discriminatedUnion('type', [
			z.object({ type: z.literal('person'), DOB: z.date() }),
			z.object({ type: z.literal('corporate'), taxId: z.string().min(5) })
		])
		.default({ type: 'person', DOB: new Date() })
});
