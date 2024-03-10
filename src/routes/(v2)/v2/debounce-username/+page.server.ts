import { superValidate, message, setError } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';
import type { Actions } from './$types.js';

const usernameSchema = schema.pick({ username: true });

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions: Actions = {
	post: async ({ request }) => {
		const form = await superValidate(request, zod(schema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	},

	check: async ({ request }) => {
		// Introduce a little delay
		await new Promise((res) => setTimeout(res, Math.random() * 500));

		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(usernameSchema));
		if (!form.valid) return { form };

		console.log('🚀 ~ check: ~ form:', form);

		if (natoAlphabetNames.includes(form.data.username)) {
			return setError(form, 'username', 'Username is already taken.');
		}

		return { form };
	}
};

const natoAlphabetNames = [
	'Alpha',
	'Bravo',
	'Charlie',
	'Delta',
	'Echo',
	'Foxtrot',
	'Golf',
	'Hotel',
	'India',
	'Juliet',
	'Kilo',
	'Lima',
	'Mike',
	'November',
	'Oscar',
	'Papa',
	'Quebec',
	'Romeo',
	'Sierra',
	'Tango',
	'Uniform',
	'Victor',
	'Whiskey',
	'Xray',
	'Yankee',
	'Zulu'
].map((n) => n.toLowerCase());
