import { z } from 'zod';
export const userSchema = z
	.object({
		salutationId: z.number().positive(),
		//.default('' as unknown as number),
		name: z.string().min(1),
		email: z.string().email(),
		confirmEmail: z.string().email()
	})
	.refine(
		(data) => {
			console.log('REFINE', data);
			return data.email == data.confirmEmail;
		},
		{
			message: 'Email doesnt match',
			path: ['confirmEmail']
		}
	);
