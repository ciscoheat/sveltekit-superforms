import z from 'zod/v3';

export const login_schema = z.object({
	email: z.string().email(),
	password: z.string()
});
