import { z } from 'zod';

const questionSchema = z.object({
	text: z.string().min(2, 'Ask a longer question.'),
	generated: z.boolean()
});

const questionArraySchema = z
	.array(questionSchema)
	.min(1, { message: 'Must have at least one question' });

export const postSchema = z.object({
	questions: questionArraySchema
});
