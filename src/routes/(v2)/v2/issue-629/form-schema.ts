import z4 from 'zod/v4';

export const v4FormSchema = z4.object({
	dateTime: z4.date()
});
