import { z } from 'zod';

export const optionsSchema = z
	.enum(['option_1', 'option_2', 'option_3', 'option_4'])
	.default('option_1');

export const formSchema = z.object({
	multiselect: optionsSchema.array(),
	select: optionsSchema
});
