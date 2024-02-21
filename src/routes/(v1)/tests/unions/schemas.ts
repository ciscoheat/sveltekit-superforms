import { z } from 'zod';

export const schema = z.object({
	references: z
		.object({
			id: z.string().nonempty({ message: 'This field is required.' }),
			value: z.string().nonempty({ message: 'This field is required.' })
		})
		.or(z.object({ id: z.string().max(0), value: z.string().max(0) }))
		.array()
		.default([{ id: '', value: '' }])
});

export const schema2 = z.object({
	references: z
		.object({
			id: z.string().nonempty({ message: 'This field is required.' }),
			value: z.string().nonempty({ message: 'This field is required.' })
		})
		.array()
		.default([{ id: '', value: '' }])
});
