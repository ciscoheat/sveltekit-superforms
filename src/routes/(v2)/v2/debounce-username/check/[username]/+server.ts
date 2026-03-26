import { schema } from '../../schema.js';
import type { RequestHandler } from './$types.js';
import { actionResult, setError, superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { takenUsernames } from '../../usernames.js';

const usernameSchema = schema.pick({ username: true });

export const POST: RequestHandler = async ({ params }) => {
	// Introduce a little delay
	await new Promise((res) => setTimeout(res, Math.random() * 500));

	const form = await superValidate({ username: params.username }, zod(usernameSchema));
	if (!form.valid) return actionResult('failure', { form });

	if (takenUsernames.includes(form.data.username)) {
		setError(form, 'username', 'Username is already taken.');
		return actionResult('failure', { form });
	}

	return actionResult('success', { form });
};
