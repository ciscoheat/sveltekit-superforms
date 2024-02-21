import { z } from 'zod';

const overallValidation = (data: { name: string; email: string }): boolean => {
	const result = !!data.name || !!data.email;
	console.log('overallValidation result:', result);
	return result;
};

export const editPageSchema = z
	.object({
		name: z.string().min(1, 'Name is required'),
		email: z.string().email({ message: 'Invalid email address' })
	})
	.refine(overallValidation, 'Ouchie everything is wrong...');

export type EditPageFormData = z.infer<typeof editPageSchema>;
