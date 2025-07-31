import { z } from 'zod/v3';

export const schema = z.object({
	name: z.string().min(1)
});

export type Message = {
	type: 'success' | 'error';
	text: string;
};
