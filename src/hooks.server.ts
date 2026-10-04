import { error } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.request.method === 'POST' && event.request.url.includes('?throw-hooks-error')) {
		error(403, 'Hooks error');
	}

	return await resolve(event);
};
