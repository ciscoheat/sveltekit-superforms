import { json } from '@sveltejs/kit';
import { schema } from '../../schema';
import { RequestHandler } from './$types';
import { actionResult, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

const usernameSchema = schema.pick({ username: true });

export const POST: RequestHandler = async ({ params }) => {
	// Introduce a little delay
	await new Promise((res) => setTimeout(res, Math.random() * 500));

	const form = await superValidate({ username: params.username }, zod(usernameSchema));
	if (!form.valid) return actionResult('failure', { form })

	if (natoAlphabetNames.includes(form.data.username)) {
		setError(form, 'username', 'Username is already taken.');
		return actionResult('failure', { form })
	}

	return 
};

