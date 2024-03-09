import { redirect } from 'sveltekit-flash-message/server';
import { message, superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { login_schema } from './schema.js';

export async function load() {
	return {
		form: await superValidate(zod(login_schema))
	};
}

/**
 * Page form actions handlers
 */
export const actions = {
	/**
	 * default() form handler
	 * can be used only if other named actions not defined
	 * better use named actions to keep it clear
	 */
	// default: async ({locals, request}) => {},

	/**
	 * handle signup form login
	 */
	login: async ({ request, cookies }) => {
		const form = await superValidate(request, zod(login_schema));

		// Clientside validation failed
		if (!form.valid) {
			return message(form, { type: 'error', message: 'Login input wrong' }, { status: 400 });
		}

		console.log('Login successful');

		// Redirect to home and send login succesfully message
		return redirect(303, '/v2/redirect-login', { type: 'ok', message: 'Login success' }, cookies);
	}
};
