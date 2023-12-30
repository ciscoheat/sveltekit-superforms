import { z } from 'zod';
import { superValidate } from '$lib/client/index.js';

const Schema = z.object({
	title: z.string().min(3)
});

export const load = async () => {
	const form = await superValidate(Schema);
	return { form };
};
