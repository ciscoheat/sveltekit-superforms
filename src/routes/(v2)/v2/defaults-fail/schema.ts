import { z } from 'zod';

export const schema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	nested: z.object({
		name: z.string().min(1),
		email: z.string().email()
	})
});

export const defaults = {
	name: 'dname',
	email: 'd@example.com',
	// Removing nested object below fixes error.
	// As does not giving Zod {defaults}.
	nested: {
		name: 'dname',
		email: 'd@example.com'
	}
};
