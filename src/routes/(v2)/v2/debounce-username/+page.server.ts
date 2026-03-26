import { superValidate, message, setError, type SuperValidated, type Infer } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';
import type { Actions } from './$types.js';
import { takenUsernames } from './usernames.js';

const usernameSchema = schema.pick({ username: true });

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

function checkUsername(form: SuperValidated<Infer<typeof schema>>) {
	if (takenUsernames.includes(form.data.username)) {
		setError(form, 'username', 'Username is already taken.');
		return false;
	}
	return true;
}

export const actions: Actions = {
	post: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		if (!form.valid || !checkUsername(form)) return fail(400, { form });

		console.log(form);

		// TODO: Create user

		return message(form, 'Form posted successfully!');
	},

	check: async ({ request }) => {
		// Introduce a little delay (large DB check)
		await new Promise((res) => setTimeout(res, Math.random() * 500));

		const form = await superValidate(request, zod(usernameSchema));

		if (!form.valid || !checkUsername(form)) return fail(400, { form });
		else return { form };
	}
};
