import { error, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.request.method === 'POST' && event.request.url.includes('?throw-hooks-error')) {
		error(403, {
			message: 'Hooks error'
		});
	}

	return await resolve(event);
};
