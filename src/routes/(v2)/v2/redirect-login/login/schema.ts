import z from 'zod';

export const login_schema = z.object({
	email: z.string().email(),
	password: z.string()
});
